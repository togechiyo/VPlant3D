import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '5173', 10);
const maxAssetBytes = 256 * 1024 * 1024;
const assets = new Map();
const motionBufferedBytesThreshold = 128 * 1024;
const maxDebugEvents = 2000;
const debugEvents = [];
let latestVrmAssetMessage = null;
let latestVrmaSlotsMessage = null;
let latestStateMessage = null;
let latestStaticStateMessage = null;
let latestMotionStateMessage = null;
let latestExpressionStateMessage = null;
let latestRuntimeStateMessage = null;
let latestVrmaCommandMessage = null;
let activeControlSocket = null;
const clientRoles = new WeakMap();
const clientIds = new WeakMap();
let nextClientId = 1;

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    host,
  },
  appType: 'spa',
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);

  if (request.method === 'POST' && url.pathname === '/relay/assets') {
    await handleAssetUpload(request, response, url.searchParams.get('kind'));
    return;
  }

  if (request.method === 'GET' && url.pathname?.startsWith('/relay/assets/')) {
    handleAssetDownload(request, response, url.pathname);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/relay/debug-log') {
    writeJson(response, 200, {
      generatedAt: Date.now(),
      activeControlId: activeControlSocket ? clientIds.get(activeControlSocket) : null,
      clientCount: webSocketServer.clients.size,
      events: debugEvents,
    });
    return;
  }

  if (request.method === 'DELETE' && url.pathname === '/relay/debug-log') {
    debugEvents.length = 0;
    writeJson(response, 200, { ok: true });
    return;
  }

  vite.middlewares(request, response);
});

const webSocketServer = new WebSocketServer({
  noServer: true,
  path: '/relay/ws',
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);

  if (url.pathname !== '/relay/ws') {
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    webSocketServer.emit('connection', webSocket, request);
  });
});

webSocketServer.on('connection', (webSocket) => {
  const clientId = nextClientId;
  nextClientId += 1;
  clientIds.set(webSocket, clientId);
  pushDebugEvent({
    kind: 'connection',
    socketId: clientId,
  });
  sendLatestMessages(webSocket);

  webSocket.on('message', (data) => {
    const message = data.toString();
    const parsedMessage = parseRelayMessage(message);

    if (parsedMessage?.type === 'hello') {
      clientRoles.set(webSocket, parsedMessage.role);
      if (parsedMessage.role === 'control') {
        activeControlSocket = webSocket;
      }
      pushDebugEvent({
        kind: 'hello',
        socketId: clientId,
        role: parsedMessage.role,
        activeControlId: activeControlSocket ? clientIds.get(activeControlSocket) : null,
      });
      return;
    }

    if (parsedMessage?.type === 'debugSample') {
      pushDebugEvent({
        kind: 'renderSample',
        socketId: clientId,
        role: clientRoles.get(webSocket) ?? 'unknown',
        sample: summarizeDebugSample(parsedMessage.sample),
      });
      return;
    }

    const isRealtimeState =
      message.includes('"type":"runtimeState"') ||
      message.includes('"type":"motionState"') ||
      message.includes('"type":"expressionState"');

    if (isRealtimeState && webSocket !== activeControlSocket) {
      pushDebugEvent({
        kind: 'realtime',
        socketId: clientId,
        role: clientRoles.get(webSocket) ?? 'unknown',
        accepted: false,
        reason: 'stale-control',
        message: summarizeRelayMessage(parsedMessage),
        activeControlId: activeControlSocket ? clientIds.get(activeControlSocket) : null,
      });
      return;
    }

    rememberLatestMessage(message);
    if (isRealtimeState) {
      pushDebugEvent({
        kind: 'realtime',
        socketId: clientId,
        role: clientRoles.get(webSocket) ?? 'unknown',
        accepted: true,
        message: summarizeRelayMessage(parsedMessage),
        activeControlId: activeControlSocket ? clientIds.get(activeControlSocket) : null,
      });
    }

    for (const client of webSocketServer.clients) {
      if (client !== webSocket && client.readyState === 1) {
        if (isRealtimeState && client.bufferedAmount > motionBufferedBytesThreshold) {
          continue;
        }

        client.send(message);
      }
    }
  });

  webSocket.on('close', () => {
    pushDebugEvent({
      kind: 'close',
      socketId: clientId,
      role: clientRoles.get(webSocket) ?? 'unknown',
    });
    clientRoles.delete(webSocket);
    clientIds.delete(webSocket);
    if (activeControlSocket === webSocket) {
      activeControlSocket = null;
    }
  });
});

server.listen(port, host, () => {
  console.log(`VPlant3D dev relay running at http://${host}:${port}/`);
});

function sendLatestMessages(webSocket) {
  for (const message of [
    latestVrmAssetMessage,
    latestVrmaSlotsMessage,
    latestStateMessage,
    latestStaticStateMessage,
    latestRuntimeStateMessage,
    latestMotionStateMessage,
    latestExpressionStateMessage,
    latestVrmaCommandMessage,
  ]) {
    if (message && webSocket.readyState === 1) {
      webSocket.send(message);
    }
  }
}

function rememberLatestMessage(message) {
  if (message.includes('"type":"runtimeState"')) {
    latestRuntimeStateMessage = message;
    return;
  }

  if (message.includes('"type":"expressionState"')) {
    latestExpressionStateMessage = message;
    return;
  }

  if (message.includes('"type":"motionState"')) {
    latestMotionStateMessage = message;
    return;
  }

  if (message.includes('"type":"staticState"')) {
    latestStaticStateMessage = message;
    return;
  }

  if (message.includes('"type":"state"')) {
    latestStateMessage = message;
    return;
  }

  if (message.includes('"type":"vrmaCommand"')) {
    latestVrmaCommandMessage = message;
    return;
  }

  if (message.includes('"type":"vrmaSlots"')) {
    latestVrmaSlotsMessage = message;
    return;
  }

  try {
    const parsed = JSON.parse(message);

    if (parsed?.type === 'asset' && parsed.asset?.kind === 'vrm') {
      latestVrmAssetMessage = message;
      return;
    }
  } catch {
    // Ignore malformed client messages; browser clients also validate on receipt.
  }
}

function parseRelayMessage(message) {
  try {
    const parsed = JSON.parse(message);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function pushDebugEvent(event) {
  debugEvents.push({
    at: Date.now(),
    ...event,
  });

  if (debugEvents.length > maxDebugEvents) {
    debugEvents.splice(0, debugEvents.length - maxDebugEvents);
  }
}

function summarizeRelayMessage(message) {
  if (!message || typeof message !== 'object') {
    return { type: 'unknown' };
  }

  if (
    message.type === 'runtimeState' ||
    message.type === 'motionState' ||
    message.type === 'expressionState'
  ) {
    return summarizeStateMessage(message);
  }

  return { type: message.type ?? 'unknown' };
}

function summarizeStateMessage(message) {
  const state = message.state ?? {};
  return {
    type: message.type,
    sequence: state.sequence ?? null,
    sentAt: state.sentAt ?? null,
    expressions: summarizeExpressions(state.expressions),
    pose: summarizePose(state.pose),
  };
}

function summarizeDebugSample(sample) {
  return {
    sentAt: sample?.sentAt ?? null,
    runtimeSequence: sample?.runtimeSequence ?? null,
    runtimeAgeMs: sample?.runtimeAgeMs ?? null,
    expressions: {
      rx: summarizeExpressions(sample?.expressions?.rx),
      target: summarizeExpressions(sample?.expressions?.target),
      set: summarizeExpressions(sample?.expressions?.set),
      afterUpdate: summarizeExpressions(sample?.expressions?.afterUpdate),
    },
    pose: summarizePose(sample?.pose),
    dropped: sample?.dropped ?? null,
    bufferedAmount: sample?.bufferedAmount ?? null,
  };
}

function summarizeExpressions(expressions) {
  return {
    blinkLeft: roundDebugNumber(expressions?.blinkLeft),
    blinkRight: roundDebugNumber(expressions?.blinkRight),
    aa: roundDebugNumber(expressions?.aa),
    ih: roundDebugNumber(expressions?.ih),
    ou: roundDebugNumber(expressions?.ou),
    ee: roundDebugNumber(expressions?.ee),
    oh: roundDebugNumber(expressions?.oh),
    happy: roundDebugNumber(expressions?.happy),
    surprised: roundDebugNumber(expressions?.surprised),
  };
}

function summarizePose(pose) {
  return {
    head: pose?.head
      ? {
          enabled: Boolean(pose.head.enabled),
          pitch: roundDebugNumber(pose.head.pitch),
          yaw: roundDebugNumber(pose.head.yaw),
          roll: roundDebugNumber(pose.head.roll),
        }
      : null,
    upperBody: pose?.upperBody
      ? {
          enabled: Boolean(pose.upperBody.enabled),
          chestYaw: roundDebugNumber(pose.upperBody.chestYaw),
          chestRoll: roundDebugNumber(pose.upperBody.chestRoll),
        }
      : null,
    hands: {
      left: Boolean(pose?.hands?.left),
      right: Boolean(pose?.hands?.right),
    },
  };
}

function roundDebugNumber(value) {
  return typeof value === 'number' ? Math.round(value * 1000) / 1000 : null;
}

async function handleAssetUpload(request, response, kindValue) {
  const kind = kindValue === 'vrma' ? 'vrma' : kindValue === 'vrm' ? 'vrm' : null;

  if (!kind) {
    writeJson(response, 400, { error: 'kind must be vrm or vrma' });
    return;
  }

  try {
    const buffer = await readRequestBody(request);
    const id = randomUUID();
    const encodedName = request.headers['x-vplant3d-file-name'];
    const name =
      typeof encodedName === 'string' && encodedName.trim().length > 0
        ? decodeURIComponent(encodedName)
        : `${kind}-${id}`;
    const contentType =
      typeof request.headers['content-type'] === 'string'
        ? request.headers['content-type']
        : 'application/octet-stream';
    const asset = {
      id,
      kind,
      name,
      contentType,
      buffer,
      createdAt: Date.now(),
    };
    assets.set(id, asset);

    writeJson(response, 200, {
      id,
      kind,
      name,
      url: `/relay/assets/${id}`,
    });
  } catch (error) {
    writeJson(response, 413, {
      error: error instanceof Error ? error.message : 'asset upload failed',
    });
  }
}

function handleAssetDownload(_request, response, pathname) {
  const id = pathname.split('/').pop() ?? '';
  const asset = assets.get(id);

  if (!asset) {
    writeJson(response, 404, { error: 'asset not found' });
    return;
  }

  response.writeHead(200, {
    'content-type': asset.contentType,
    'content-length': asset.buffer.byteLength,
    'cache-control': 'no-store',
    'x-vplant3d-file-name': encodeURIComponent(asset.name),
  });
  response.end(asset.buffer);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on('data', (chunk) => {
      totalBytes += chunk.byteLength;

      if (totalBytes > maxAssetBytes) {
        reject(new Error('asset is too large'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    request.on('error', reject);
  });
}

function writeJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}
