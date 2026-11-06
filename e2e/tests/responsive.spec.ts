import { test, expect } from '@playwright/test';
import { assertNoHorizontalOverflow, login, openDeviceCheck, registerAccount } from './support/flows';

for (const width of [320, 390, 768, 1280]) {
  test(`layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /Create Account/ })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.goto('/rules');
    await assertNoHorizontalOverflow(page);
  });
}

test('authenticated mobile setup keeps controls usable without horizontal scrolling', async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await login(page, await registerAccount(request));
  await assertNoHorizontalOverflow(page);
  await openDeviceCheck(page, { topic: 'Science' });
  await assertNoHorizontalOverflow(page);
  await expect(page.getByRole('button', { name: /Enable camera & microphone/i })).toBeVisible();
});

test('mobile navigation opens, supports Escape, and never exposes desktop-only controls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open menu' });
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await assertNoHorizontalOverflow(page);
});
