import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const aliciaVrmPath = resolve(
  'local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm',
);

test('Setup Mode shows the canvas and local VRM file input', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('Setup Mode')).toBeVisible();
  await expect(page.getByText('Load local VRM')).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', '.vrm');
  expect(errors()).toEqual([]);
});

test('OBS transparent mode hides Setup UI but keeps the scene canvas', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/?obs=1&transparent=1');

  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
  await expect(page.getByText('Load local VRM')).toHaveCount(0);
  await expect(page.getByText('Setup Mode')).toHaveCount(0);
  expect(errors()).toEqual([]);
});

test('loads the local Alicia VRM candidate when it exists', async ({ page }) => {
  test.skip(!existsSync(aliciaVrmPath), 'local Alicia VRM is not available in this workspace');

  const errors = collectPageErrors(page);

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(aliciaVrmPath);

  await expect(page.getByText('VRM loaded.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('AliciaSolid.vrm')).toBeVisible();
  await expect(page.locator('canvas.scene-canvas')).toBeVisible();
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
