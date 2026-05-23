import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '5173', 10);
const maxAssetBytes = 256 * 1024 * 1024;
const assets = new Map();
const motionBufferedBytesThreshold = 128 * 1024;
let latestVrmAssetMessage = null;
let latestVrmaSlotsMessage = null;
let latestStateMessage = null;
let latestStaticStateMessage = null;
let latestMotionStateMessage = null;
let latestVrmaCommandMessage = null;

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
  sendLatestMessages(webSocket);

  webSocket.on('message', (data) => {
    const message = data.toString();
    rememberLatestMessage(message);
    const isMotionState = message.includes('"type":"motionState"');

    for (const client of webSocketServer.clients) {
      if (client !== webSocket && client.readyState === 1) {
        if (isMotionState && client.bufferedAmount > motionBufferedBytesThreshold) {
          continue;
        }

        client.send(message);
      }
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
    latestMotionStateMessage,
    latestVrmaCommandMessage,
  ]) {
    if (message && webSocket.readyState === 1) {
      webSocket.send(message);
    }
  }
}

function rememberLatestMessage(message) {
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
