import { spawn } from 'node:child_process';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '5173', 10);
const healthUrl = `http://${host}:${port}/relay/health`;
let relayProcess = null;
let attachedToExistingRelay = false;

const health = await checkRelayHealth();
const hasLegacyVPlantRelay = health ? false : await checkLegacyVPlantRelay();

if ((health?.ok && health.app === 'vplant3d') || hasLegacyVPlantRelay) {
  attachedToExistingRelay = true;
  console.log(`VPlant3D relay already running at http://${host}:${port}/`);
  if (hasLegacyVPlantRelay) {
    console.log('The existing relay does not expose /relay/health; treating it as legacy VPlant3D.');
  }
  console.log('Tauri dev will attach to the existing relay.');
} else {
  console.log(`Starting VPlant3D relay for Tauri dev at http://${host}:${port}/`);
  relayProcess = spawn(process.execPath, ['server/vplant-relay.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: host,
      PORT: String(port),
    },
    stdio: 'inherit',
  });

  relayProcess.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }

    process.exit(code ?? 0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

setInterval(() => {
  // Keep this process alive while Tauri dev is running.
}, 60_000);

async function checkRelayHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(healthUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkLegacyVPlantRelay() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 700);

  try {
    const response = await fetch(`http://${host}:${port}/?control=1`, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const text = await response.text();
    return text.includes('VPlant3D');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function shutdown() {
  if (relayProcess && !relayProcess.killed) {
    relayProcess.kill('SIGTERM');
  }

  if (attachedToExistingRelay) {
    console.log('Leaving existing VPlant3D relay running.');
  }

  process.exit(0);
}
