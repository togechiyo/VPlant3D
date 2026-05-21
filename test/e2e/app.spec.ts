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
  await expect(page.getByText('Setup Mode')).toBeVisible();
  await expect(page.getByText('Load local VRM', { exact: true })).toBeVisible();
  await expect(page.getByText('Load local VRMA', { exact: true })).toBeVisible();
  await expect(page.locator('#vrm-file-input')).toHaveAttribute('accept', '.vrm');
  await expect(page.locator('#vrma-file-input')).toHaveAttribute('accept', '.vrma');
  await expect(page.locator('#vrma-file-input')).toHaveAttribute('multiple', '');
  await expect(page.getByText('Load a VRM before playing VRMA.')).toBeVisible();
  await expect(page.locator('#vrma-play-button')).toBeDisabled();
  await expect(page.getByText('Avatar Framing')).toBeVisible();
  await expect(page.locator('#avatar-offset-x-input')).toHaveValue('0');
  await expect(page.locator('#avatar-scale-input')).toHaveValue('1');
  await expect(page.getByText('Mic Reactive Mouth')).toBeVisible();
  await expect(page.getByText('Microphone idle.')).toBeVisible();
  await expect(page.locator('#mic-start-button')).toBeEnabled();
  await expect(page.locator('#mic-stop-button')).toBeDisabled();
  await expect(page.getByText('Auto blink')).toBeVisible();
  await expect(page.locator('#auto-blink-input')).toBeChecked();
  await expect(page.getByText('Idle sway')).toBeVisible();
  await expect(page.locator('#idle-sway-input')).toBeChecked();
  await expect(page.getByText('Expression preset')).toBeVisible();
  await expect(page.getByText('Happy')).toBeVisible();
  await expect(page.getByText('MediaPipe Pose Debug')).toBeVisible();
  await expect(page.getByText('Start camera to inspect upper-body landmarks.')).toBeVisible();
  await expect(page.getByText('Camera image hidden. Skeleton only.')).toBeVisible();
  await expect(page.locator('#pose-video')).toHaveCSS('opacity', '0');
  await expect(page.getByText('Mirror input')).toBeVisible();
  await expect(page.locator('#pose-mirror-input')).toBeChecked();
  await expect(page.getByText('Face / lips')).toBeVisible();
  await expect(page.locator('#hand-tracking-input')).toBeChecked();
  await expect(page.getByText('Hand Skeleton', { exact: true })).toBeVisible();
  await expect(page.getByText('Debug overlay only')).toBeVisible();
  await expect(page.getByText('VRM finger retarget is not implemented yet.')).toBeVisible();
  await expect(page.locator('#face-tracking-input')).toBeChecked();
  await expect(page.locator('#pose-start-button')).toBeEnabled();
  await expect(page.locator('#pose-stop-button')).toBeDisabled();
  expect(errors()).toEqual([]);
});

test('OBS transparent mode hides Setup UI but keeps the scene canvas', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?obs=1&transparent=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('Load local VRM', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Load local VRMA', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mic Reactive Mouth')).toHaveCount(0);
  await expect(page.getByText('Auto blink')).toHaveCount(0);
  await expect(page.getByText('Expression preset')).toHaveCount(0);
  await expect(page.getByText('MediaPipe Pose Debug')).toHaveCount(0);
  await expect(page.getByText('Setup Mode')).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('loads the local Alicia VRM candidate when it exists', async ({ page }) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');

  const errors = collectPageErrors(page);

  await page.goto('/');
  await page.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);

  await expect(page.getByText('VRM loaded.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('AliciaSolid.vrm')).toBeVisible();
  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  expect(errors()).toEqual([]);
});

test('loads the local VRMA candidate and toggles playback when local assets exist', async ({
  page,
}) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');
  test.skip(!existsSync(greetingVrmaPath), 'local greeting VRMA is not available in this workspace');

  const errors = collectPageErrors(page);

  await page.goto('/');
  await page.locator('#vrm-file-input').setInputFiles(aliciaVrmPath);
  await expect(page.getByText('VRM loaded.')).toBeVisible({ timeout: 30_000 });

  await page.locator('#vrma-file-input').setInputFiles(greetingVrmaPath);
  await expect(page.getByText('VRMA loaded.')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#vrma-file-text')).toContainText('VRMA_02.vrma');
  await expect(page.locator('#vrma-slot-list button')).toContainText('VRMA_02.vrma');
  await expect(page.getByText('Ready to play in loop mode.')).toBeVisible();
  await expect(page.locator('#vrma-play-button')).toBeEnabled();

  await page.locator('#vrma-play-button').click();
  await expect(page.getByText('VRMA playing.')).toBeVisible();
  await expect(page.locator('#vrma-stop-button')).toBeEnabled();

  await page.locator('#vrma-stop-button').click();
  await expect(page.getByText('VRMA loaded.')).toBeVisible();
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
