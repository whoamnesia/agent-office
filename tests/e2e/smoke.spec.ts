import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '../..');
let daemon: ChildProcess;
let url = '';
const shots = path.join(root, 'test-results/phases');

test.beforeAll(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-e2e-'));
  daemon = spawn(process.execPath, [path.join(root, 'plugin/dist/daemon.mjs'), '--demo', '--port', '0'], { env: { ...process.env, AO_DATA_DIR: data }, stdio: 'ignore' });
  for (let i = 0; i < 100 && !url; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const info = JSON.parse(fs.readFileSync(path.join(data, 'daemon.json'), 'utf8'));
      url = `http://127.0.0.1:${info.port}/?t=${info.token}`;
    } catch {
      /* not yet */
    }
  }
  fs.mkdirSync(shots, { recursive: true });
});
test.afterAll(() => daemon?.kill());

test('demo office comes alive in under 5 s and reacts to controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__ao?.ready === true);
  await expect(page.locator('.ao-pill--live')).toBeVisible();
  await expect(page.locator('.ao-agent').first()).toBeVisible({ timeout: 5000 });
  expect(Date.now() - t0).toBeLessThan(5000);
  // the token is removed from the address bar after loading
  expect(page.url()).not.toContain('t=');

  // manual day/night buttons and the N hotkey
  await page.getByRole('radio', { name: /Night|Ночь/ }).click();
  await expect.poll(() => page.evaluate(() => window.__ao!.scene.day.night)).toBeGreaterThan(0.8);
  await page.getByRole('radio', { name: /Day|День/ }).click();
  await expect.poll(() => page.evaluate(() => window.__ao!.scene.day.night)).toBeLessThan(0.1);
  await page.keyboard.press('n');
  await expect.poll(() => page.evaluate(() => window.__ao!.scene.cfg.dayMode)).toBe('night');

  // selecting a worker opens the card
  await page.locator('.ao-agent').nth(1).click();
  await expect(page.locator('#ao-card')).toBeVisible();
  await expect(page.locator('#ao-card .ao-card__name')).not.toBeEmpty();
  await page.keyboard.press('Escape');

  // replay mode and back to live
  await page.locator('[data-act="replay-log"]').click();
  await expect(page.locator('.ao-pill--replay')).toBeVisible();
  await page.locator('[data-act="live"]').click();
  await expect(page.locator('.ao-pill--replay')).toHaveCount(0);

  // every phase of the day renders without errors
  for (const [name, t] of [['dawn', 0.27], ['day', 0.5], ['sunset', 0.74], ['night', 0.95]] as const) {
    await page.evaluate((tt) => window.__ao!.setTime(tt), t);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(shots, `${name}.png`) });
  }
  expect(errors).toEqual([]);
});

test('settings dialog is keyboard accessible and closes with Escape', async ({ page }) => {
  await page.goto(url);
  await page.waitForFunction(() => window.__ao?.ready === true);
  await page.getByRole('button', { name: /Settings|Настройки/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
