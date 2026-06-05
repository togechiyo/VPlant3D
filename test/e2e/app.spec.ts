import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const aliciaVrmPath = resolve(
  'local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm',
);
const greetingVrmaPath = resolve('local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma');

test('Setup Mode shows the canvas and local VRM/VRMA file inputs', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/');

  expect(page.viewportSize()).toEqual({ width: 1920, height: 1080 });
  await expect(page.locator('.control-title')).toHaveText('VPlant3D for OBS');
  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  const canvasBox = await page.locator('canvas.scene-canvas').boundingBox();
  const panelBox = await page.locator('.control-panel').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect((canvasBox?.width ?? 0) / (canvasBox?.height ?? 1)).toBeCloseTo(16 / 9, 1);
  expect(panelBox?.y ?? 0).toBeGreaterThan((canvasBox?.y ?? 0) + (canvasBox?.height ?? 0));
  expect(panelBox?.width).toBeCloseTo(canvasBox?.width ?? 0, 0);
  const drawingBufferSize = await page.locator('canvas.scene-canvas').evaluate((canvas) => ({
    width: (canvas as HTMLCanvasElement).width,
    height: (canvas as HTMLCanvasElement).height,
  }));
  expect(drawingBufferSize.width / drawingBufferSize.height).toBeCloseTo(16 / 9, 1);
  await expect(page.getByText('設定')).toBeVisible();
  await expect(page.getByText('VRMを読み込む', { exact: true })).toBeVisible();
  await expect(page.getByText('VRMAを読み込む', { exact: true })).toBeVisible();
  await expect(page.locator('#vrm-file-input')).toHaveAttribute('accept', '.vrm');
  await expect(page.locator('#vrma-file-input')).toHaveAttribute('accept', '.vrma');
  await expect(page.locator('#vrma-file-input')).toHaveAttribute('multiple', '');
  await expect(page.locator('#vrma-requirement-text')).toHaveText('VRMが必要');
  await expect(page.locator('#vrma-play-button')).toBeDisabled();
  await expect(page.getByText('OBSに貼る')).toHaveCount(1);
  await expect(page.locator('#obs-render-url-text')).toContainText('/?obs=1&transparent=1');
  await expect(page.locator('#obs-localhost-url-text')).toContainText(
    'localhost:5173/?obs=1&transparent=1',
  );
  await expect(page.locator('#obs-debug-url-text')).toContainText(
    '/?obs=1&transparent=1&debug=1',
  );
  await expect(page.locator('#control-url-text')).toContainText('/?control=1');
  await expect(page.locator('#obs-transparent-url-input')).toBeChecked();
  await page.locator('#obs-transparent-url-input').uncheck();
  await expect(page.locator('#obs-render-url-text')).toContainText('/?obs=1');
  await expect(page.locator('#obs-render-url-text')).not.toContainText('transparent=1');
  await page.locator('#obs-transparent-url-input').check();
  await expect(page.locator('#relay-status-text')).toHaveText(/接続|未接続|エラー/);
  await expect(page.locator('#render-status-text')).toHaveText(/未検出|検出/);
  await expect(page.getByText('マイク&手動モード')).toBeVisible();
  await expect(page.locator('#mic-manual-mode-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#camera-mode-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#manual-control-input')).toBeChecked();
  await expect(page.locator('#manual-mouse-input')).toBeChecked();
  await expect(page.locator('#manual-control-status-text')).toHaveText('未操作');
  await expect(page.getByText('キーライト')).toBeVisible();
  await expect(page.locator('#look-preset-select')).toHaveCount(0);
  await expect(page.locator('#key-light-scale-input')).toHaveValue('1');
  await expect(page.locator('#key-light-color-input')).toHaveValue('#ffffff');
  await expect(page.locator('#key-light-position-x-input')).toHaveValue('0.15');
  await expect(page.locator('#key-light-position-y-input')).toHaveValue('4.05');
  await expect(page.locator('#key-light-position-z-input')).toHaveValue('3.65');
  await expect(page.locator('#key-light-shadow-input')).not.toBeChecked();
  await expect(page.locator('#key-light-shadow-text')).toHaveText('OFF');
  await expect(page.locator('#fill-light-scale-input')).toHaveCount(0);
  await expect(page.locator('#rim-light-strength-select')).toHaveCount(0);
  await expect(page.getByText('位置調整')).toBeVisible();
  await expect(page.locator('#avatar-offset-x-input')).toHaveValue('0');
  await expect(page.locator('#avatar-offset-x-input')).toHaveAttribute('min', '-2');
  await expect(page.locator('#avatar-offset-x-input')).toHaveAttribute('max', '2');
  await expect(page.locator('#avatar-offset-y-input')).toHaveAttribute('min', '-1.6');
  await expect(page.locator('#avatar-offset-y-input')).toHaveAttribute('max', '1.6');
  await expect(page.locator('#avatar-scale-input')).toHaveValue('1');
  await expect(page.getByText('マイク停止中')).toBeVisible();
  await expect(page.locator('#mic-start-button')).toBeEnabled();
  await expect(page.locator('#mic-stop-button')).toBeDisabled();
  await expect(page.locator('#audio-device-select')).toBeVisible();
  await expect(page.locator('#audio-device-select option').first()).toHaveText('既定のマイク');
  await expect(page.locator('#audio-device-refresh-button')).toBeVisible();
  await expect(page.getByText('まばたき', { exact: true })).toBeVisible();
  await expect(page.locator('#blink-mode-select')).toHaveValue('auto');
  await expect(page.locator('#blink-mode-select option[value="mocap"]')).toHaveCount(0);
  await expect(page.locator('#lip-sync-mode-select')).toHaveValue('mic');
  await expect(page.locator('#lip-sync-mode-select option[value="mocap"]')).toHaveCount(0);
  await expect(page.getByText('揺らぎ')).toBeVisible();
  await expect(page.locator('#idle-sway-input')).toBeChecked();
  await expect(page.getByText('表情')).toBeVisible();
  await expect(page.getByText('自然')).toBeVisible();
  await expect(page.getByText('喜')).toBeVisible();
  await expect(page.getByText('怒')).toBeVisible();
  await expect(page.getByText('哀')).toBeVisible();
  await expect(page.getByText('楽')).toBeVisible();
  await expect(page.getByText('驚')).toBeVisible();
  await expect(page.locator('#expression-preset-text')).toHaveText('なし');
  await expect(page.getByText('カメラモード')).toBeHidden();
  await page.locator('#camera-mode-button').click();
  await expect(page.locator('#mic-manual-mode-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#camera-mode-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('カメラモード')).toBeVisible();
  await expect(page.getByText('まばたき / 口: カメラ')).toBeVisible();
  await expect(page.getByText('頭 / 体: カメラ')).toBeVisible();
  await expect(page.getByText('骨格のみ表示')).toBeVisible();
  await expect(page.locator('#pose-video')).toHaveCSS('opacity', '0');
  await expect(page.getByText('ミラー')).toBeVisible();
  await expect(page.locator('#pose-mirror-input')).toBeChecked();
  await expect(page.locator('#video-device-select')).toBeVisible();
  await expect(page.locator('#video-device-select option').first()).toHaveText('既定のカメラ');
  await expect(page.locator('#video-device-refresh-button')).toBeVisible();
  await expect(page.getByText('実験')).toHaveCount(0);
  await expect(page.locator('#hand-tracking-input')).toHaveCount(0);
  await expect(page.locator('#pose-start-button')).toBeEnabled();
  await expect(page.locator('#pose-stop-button')).toBeDisabled();
  expect(errors()).toEqual([]);
});

test('Control page restores saved local settings', async ({ page }) => {
  await page.goto('/?control=1');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'vplant3d.config.v1',
      JSON.stringify({
        version: 1,
        selectedControlMode: 'camera',
        blinkMode: 'off',
        lipSyncMode: 'off',
        manualControlEnabled: false,
        manualMouseEnabled: false,
        idleSwayEnabled: false,
        poseMirrorInput: false,
        avatarTransform: {
          offsetX: 0.5,
          offsetY: -0.25,
          scale: 1.3,
          rotationY: 20,
        },
        lookSettings: {
          keyIntensityScale: 1.25,
          keyColorHex: '#aabbcc',
          keyPosition: [1, 3, 4],
          keyShadowEnabled: true,
        },
        vrmaLoop: false,
      }),
    );
  });

  await page.reload();

  await expect(page.locator('#camera-mode-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('カメラモード')).toBeVisible();
  await expect(page.locator('#pose-mirror-input')).not.toBeChecked();
  await expect(page.locator('#manual-control-input')).not.toBeChecked();
  await expect(page.locator('#manual-mouse-input')).not.toBeChecked();
  await expect(page.locator('#idle-sway-input')).not.toBeChecked();
  await expect(page.locator('#avatar-offset-x-input')).toHaveValue('0.5');
  await expect(page.locator('#avatar-offset-y-input')).toHaveValue('-0.25');
  await expect(page.locator('#avatar-scale-input')).toHaveValue('1.3');
  await expect(page.locator('#avatar-rotation-y-input')).toHaveValue('20');
  await expect(page.locator('#key-light-scale-input')).toHaveValue('1.25');
  await expect(page.locator('#key-light-color-input')).toHaveValue('#aabbcc');
  await expect(page.locator('#key-light-shadow-input')).toBeChecked();
  await expect(page.locator('#vrma-loop-input')).not.toBeChecked();
});

test('Control page keeps setup controls outside the OBS render URL', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?control=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('VRMを読み込む', { exact: true })).toBeVisible();
  await expect(page.getByText('マイク&手動モード')).toBeVisible();
  await expect(page.getByText('カメラモード')).toBeHidden();
  await page.locator('#camera-mode-button').click();
  await expect(page.getByText('カメラモード')).toBeVisible();
  await expect(page.getByText('設定')).toBeVisible();
  expect(errors()).toEqual([]);
});

test('OBS transparent mode hides Setup UI but keeps the scene canvas', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?obs=1&transparent=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('VRMを読み込む', { exact: true })).toHaveCount(0);
  await expect(page.getByText('VRMAを読み込む', { exact: true })).toHaveCount(0);
  await expect(page.getByText('手動操作', { exact: true })).toHaveCount(0);
  await expect(page.getByText('キーライト')).toHaveCount(0);
  await expect(page.getByText('マイク&手動モード')).toHaveCount(0);
  await expect(page.getByText('まばたき')).toHaveCount(0);
  await expect(page.getByText('表情')).toHaveCount(0);
  await expect(page.getByText('カメラモード')).toHaveCount(0);
  await expect(page.getByText('設定')).toHaveCount(0);
  await expect(page.locator('.relay-debug-overlay')).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('OBS debug mode shows relay diagnostics without setup controls', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?obs=1&transparent=1&debug=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.locator('.relay-debug-overlay')).toBeVisible();
  await expect(page.locator('.relay-debug-overlay')).toContainText('OBS Relay Debug');
  await expect(page.locator('.relay-debug-overlay')).toContainText('runtime #');
  await expect(page.getByText('VRMを読み込む', { exact: true })).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('relays manual pose changes to OBS debug runtime state', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080,
    },
  });
  const renderPage = await context.newPage();
  const controlPage = await context.newPage();
  const renderErrors = collectPageErrors(renderPage);
  const controlErrors = collectPageErrors(controlPage);

  await controlPage.goto('/?control=1');

  const canvas = controlPage.locator('canvas.scene-canvas');
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  const startX = (canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) / 2;
  const startY = (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) / 2;
  await controlPage.mouse.move(startX, startY);
  await controlPage.mouse.down({ button: 'left' });
  await controlPage.mouse.move(startX + 180, startY + 40, { steps: 8 });
  await controlPage.mouse.up({ button: 'left' });
  await expect(controlPage.locator('#manual-control-status-text')).toHaveText('顔操作');

  await renderPage.goto('/?obs=1&transparent=1&debug=1');
  await expect(renderPage.locator('.relay-debug-overlay')).toBeVisible();
  await expect
    .poll(async () =>
      extractRelayDebugHeadYaw(await renderPage.locator('.relay-debug-overlay').textContent()),
    )
    .toBeGreaterThan(0.01);
  expect([...renderErrors(), ...controlErrors()]).toEqual([]);
  await context.close();
});

test('Control page updates key light look controls', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?control=1');

  await page.locator('#key-light-scale-input').fill('1.5');
  await page.locator('#key-light-color-input').fill('#ff66aa');
  await page.locator('#key-light-position-x-input').fill('-1.25');
  await page.locator('#key-light-position-y-input').fill('4.5');
  await page.locator('#key-light-position-z-input').fill('2.25');
  await page.locator('#key-light-shadow-input').check();

  await expect(page.locator('#look-preset-select')).toHaveCount(0);
  await expect(page.locator('#key-light-scale-text')).toHaveText('150%');
  await expect(page.locator('#key-light-color-input')).toHaveValue('#ff66aa');
  await expect(page.locator('#key-light-position-x-text')).toHaveText('-1.25');
  await expect(page.locator('#key-light-position-y-text')).toHaveText('4.50');
  await expect(page.locator('#key-light-position-z-text')).toHaveText('2.25');
  await expect(page.locator('#key-light-shadow-text')).toHaveText('ON');
  await expect(page.locator('#fill-light-scale-input')).toHaveCount(0);
  await expect(page.locator('#rim-light-strength-select')).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('Control preview accepts manual mouse controls', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?control=1');
  const canvas = page.locator('canvas.scene-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(x + 80, y - 40);
  await page.mouse.up({ button: 'left' });
  await expect(page.locator('#manual-control-status-text')).toHaveText('顔操作');

  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(x + 40, y + 20);
  await page.mouse.up({ button: 'middle' });
  await expect(page.locator('#manual-control-status-text')).toHaveText('位置調整');
  await expect(page.locator('#avatar-offset-x-input')).not.toHaveValue('0');

  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 40, y);
  await page.mouse.up({ button: 'right' });
  await expect(page.locator('#manual-control-status-text')).toHaveText('回転');
  await expect(page.locator('#avatar-rotation-y-input')).not.toHaveValue('0');

  await page.mouse.wheel(0, -120);
  await expect(page.locator('#manual-control-status-text')).toHaveText('拡大');
  await expect(page.locator('#avatar-scale-input')).not.toHaveValue('1');

  await canvas.dblclick();
  await expect(page.locator('#manual-control-status-text')).toHaveText('未操作');
  expect(errors()).toEqual([]);
});

test('loads the local Alicia VRM candidate when it exists', async ({ page }) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');

  const errors = collectPageErrors(page);

  await page.goto('/');
  await page.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);

  await expect(page.getByText('VRM読み込み済み')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('AliciaSolid.vrm')).toBeVisible();
  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  expect(errors()).toEqual([]);
});

test('relays a local VRM from Control page to OBS render page when local assets exist', async ({
  browser,
}) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');

  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080,
    },
  });
  const renderPage = await context.newPage();
  const controlPage = await context.newPage();
  const renderErrors = collectPageErrors(renderPage);
  const controlErrors = collectPageErrors(controlPage);
  const renderAssetResponse = renderPage.waitForResponse((response) =>
    response.url().includes('/relay/assets/') && response.status() === 200,
  );

  await renderPage.goto('/?obs=1&transparent=1');
  await controlPage.goto('/?control=1');
  await controlPage.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);

  await renderAssetResponse;
  await expect(controlPage.getByText('VRM読み込み済み')).toBeVisible({ timeout: 30_000 });
  await expect(renderPage.locator('canvas.scene-canvas')).toBeVisible();
  expect([...renderErrors(), ...controlErrors()]).toEqual([]);
  await context.close();
});

test('replays the latest local VRM to an OBS render page that opens later', async ({
  browser,
}) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');

  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080,
    },
  });
  const controlPage = await context.newPage();
  const controlErrors = collectPageErrors(controlPage);

  await controlPage.goto('/?control=1');
  await controlPage.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);
  await expect(controlPage.getByText('VRM読み込み済み')).toBeVisible({ timeout: 30_000 });

  const renderPage = await context.newPage();
  const renderErrors = collectPageErrors(renderPage);
  const renderAssetResponse = renderPage.waitForResponse((response) =>
    response.url().includes('/relay/assets/') && response.status() === 200,
  );

  await renderPage.goto('/?obs=1&transparent=1');
  await renderAssetResponse;
  await expect(renderPage.locator('canvas.scene-canvas')).toBeVisible();
  expect([...controlErrors(), ...renderErrors()]).toEqual([]);
  await context.close();
});

test('loads the local VRMA candidate and toggles playback when local assets exist', async ({
  page,
}) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');
  test.skip(!existsSync(greetingVrmaPath), 'local greeting VRMA is not available in this workspace');

  const errors = collectPageErrors(page);

  await page.goto('/');
  await page.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);
  await expect(page.getByText('VRM読み込み済み')).toBeVisible({ timeout: 30_000 });

  await page.locator('#vrma-file-input').setInputFiles(greetingVrmaPath);
  await expect(page.getByText('VRMA読み込み済み')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#vrma-file-text')).toContainText('VRMA_02.vrma');
  await expect(page.locator('#vrma-slot-list button')).toContainText('VRMA_02.vrma');
  await expect(page.getByText('ループ再生可')).toBeVisible();
  await expect(page.locator('#vrma-play-button')).toBeEnabled();

  await page.locator('#vrma-play-button').click();
  await expect(page.getByText('VRMA再生中')).toBeVisible();
  await expect(page.locator('#vrma-stop-button')).toBeEnabled();

  await page.locator('#vrma-stop-button').click();
  await expect(page.getByText('VRMA読み込み済み')).toBeVisible();
  await expect(page.locator('#vrma-play-button')).toBeEnabled();
  expect(errors()).toEqual([]);
});

function collectPageErrors(page: Page): () => string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  return () => errors;
}

function extractRelayDebugHeadYaw(text: string | null): number {
  const match = text?.match(/head yaw\/pitch\/roll (-?\d+\.\d+)/);
  const yawText = match?.[1];
  return yawText ? Math.abs(Number.parseFloat(yawText)) : 0;
}
