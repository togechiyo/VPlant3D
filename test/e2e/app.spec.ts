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
  await expect(page.getByText('位置調整')).toBeVisible();
  await expect(page.locator('#avatar-offset-x-input')).toHaveValue('0');
  await expect(page.locator('#avatar-scale-input')).toHaveValue('1');
  await expect(page.getByText('顔 / 口')).toBeVisible();
  await expect(page.getByText('マイク停止中')).toBeVisible();
  await expect(page.locator('#mic-start-button')).toBeEnabled();
  await expect(page.locator('#mic-stop-button')).toBeDisabled();
  await expect(page.getByText('まばたき')).toBeVisible();
  await expect(page.locator('#blink-mode-select')).toHaveValue('mocap');
  await expect(page.locator('#lip-sync-mode-select')).toHaveValue('mic');
  await expect(page.getByText('揺らぎ')).toBeVisible();
  await expect(page.locator('#idle-sway-input')).toBeChecked();
  await expect(page.getByText('表情')).toBeVisible();
  await expect(page.getByText('笑顔')).toBeVisible();
  await expect(page.getByText('体トラック')).toBeVisible();
  await expect(page.getByText('上半身を動かす')).toBeVisible();
  await expect(page.getByText('骨格のみ表示')).toBeVisible();
  await expect(page.locator('#pose-video')).toHaveCSS('opacity', '0');
  await expect(page.getByText('ミラー')).toBeVisible();
  await expect(page.locator('#pose-mirror-input')).toBeChecked();
  await expect(page.locator('#hand-tracking-input')).not.toBeChecked();
  await expect(page.getByText('手', { exact: true })).toBeVisible();
  await expect(page.getByText('手 / 指')).toBeVisible();
  await expect(page.getByText('指トラック')).toBeVisible();
  await expect(page.locator('#pose-start-button')).toBeEnabled();
  await expect(page.locator('#pose-stop-button')).toBeDisabled();
  expect(errors()).toEqual([]);
});

test('Control page keeps setup controls outside the OBS render URL', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?control=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('VRMを読み込む', { exact: true })).toBeVisible();
  await expect(page.getByText('顔 / 口')).toBeVisible();
  await expect(page.getByText('体トラック')).toBeVisible();
  await expect(page.getByText('設定')).toBeVisible();
  expect(errors()).toEqual([]);
});

test('OBS transparent mode hides Setup UI but keeps the scene canvas', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?obs=1&transparent=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('VRMを読み込む', { exact: true })).toHaveCount(0);
  await expect(page.getByText('VRMAを読み込む', { exact: true })).toHaveCount(0);
  await expect(page.getByText('顔 / 口')).toHaveCount(0);
  await expect(page.getByText('まばたき')).toHaveCount(0);
  await expect(page.getByText('表情')).toHaveCount(0);
  await expect(page.getByText('体トラック')).toHaveCount(0);
  await expect(page.getByText('設定')).toHaveCount(0);
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
