import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const origin = 'http://localhost:3000';

export interface TestAccount {
  fullname: string;
  email: string;
  password: string;
}

export async function registerAccount(request: APIRequestContext): Promise<TestAccount> {
  const id = randomUUID().slice(0, 12);
  const account: TestAccount = {
    fullname: `Browser User ${id}`,
    email: `browser-${id}@example.test`,
    password: `BrowserStrong!123`,
  };
  const response = await request.post('/api/v1/auth/register', {
    data: {
      ...account,
      country: 'Pakistan',
      gender: 'male',
      education: 'Computer Science',
      acceptRules: true,
      confirmAge: true,
    },
    headers: { Origin: origin },
  });
  expect(response.status(), await response.text()).toBe(201);
  return account;
}

export async function login(page: Page, account: TestAccount) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole('button', { name: /^Login$/ }).click();
  await expect(page).toHaveURL(/\/profile(?:\?|$)/);
  await expect(page.getByRole('heading', { name: account.fullname })).toBeVisible();
}

export async function openDeviceCheck(page: Page, options: { topic?: string; language?: string; formal?: boolean } = {}) {
  await page.goto('/video');
  await expect(page.getByRole('heading', { name: 'What would you like to discuss?' })).toBeVisible();

  if (options.topic) await page.getByRole('radio', { name: options.topic }).check();
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(page.getByRole('heading', { name: 'Choose your language' })).toBeVisible();
  if (options.language) await page.getByRole('radio', { name: options.language }).check();
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(page.getByRole('heading', { name: 'How would you like to discuss?' })).toBeVisible();
  if (options.formal) await page.getByRole('radio', { name: /Structured debate/i }).check();
  await page.getByRole('button', { name: 'Check devices' }).click();

  await expect(page.getByRole('heading', { name: 'Check your camera and microphone' })).toBeVisible();
}

export async function startSearching(page: Page) {
  await page.getByRole('button', { name: /Enable camera & microphone/i }).click();
  await expect(page.getByText('Camera and microphone are ready')).toBeVisible();
  await page.getByRole('button', { name: 'Find a debate partner' }).click();
  await expect(page.getByRole('heading', { name: 'Finding your debate partner' })).toBeVisible();
}

export async function assertNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document, `Horizontal overflow: ${JSON.stringify(widths)}`)
    .toBeLessThanOrEqual(widths.viewport + 2);
}
