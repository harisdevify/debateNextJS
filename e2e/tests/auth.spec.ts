import { test, expect } from '@playwright/test';
import { login, registerAccount } from './support/flows';

test('guest navigation gates protected pages without exposing private content', async ({ page }) => {
  await page.goto('/');
  const loginCta = page.getByRole('link', { name: /Login to Start Debating/ }).first();
  await expect(loginCta).toHaveAttribute('href', '/login');
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto('/video');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Please log in' })).toBeVisible();
  await page.goto('/rules');
  await expect(page.getByRole('heading', { name: /rules|conduct/i })).toBeVisible();
});

test('register, login, refresh and logout work with first-party httpOnly cookies', async ({ page, request }) => {
  const account = await registerAccount(request);
  await login(page, account);
  const cookie = (await page.context().cookies()).find((entry) => entry.name === 'accessToken');
  expect(cookie).toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: account.fullname })).toBeVisible();
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status()).toBe(200);
  await expect(page.getByRole('link', { name: /Join.*Debate|Debate/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).first().click();
  await expect(page).toHaveURL(/\/(?:login)?(?:\?|$)/);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('new account can be registered through the real form', async ({ page }) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Full Name' }).fill(`New User ${id}`);
  await page.getByRole('textbox', { name: 'Education' }).fill('Computer Science');
  await page.getByRole('textbox', { name: 'Country' }).fill('Pakistan');
  await page.getByRole('textbox', { name: 'Email' }).fill(`ui-${id}@example.test`);
  await page.getByRole('combobox', { name: 'Gender' }).selectOption('male');
  await page.getByLabel('Password').fill('BrowserStrong!123');
  await page.getByRole('checkbox', { name: /I have read and agree/i }).check();
  await page.getByRole('checkbox', { name: /I confirm that I am 18/i }).check();
  await page.getByRole('button', { name: /Create Account/ }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
