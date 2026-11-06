import { test, expect, type Page } from '@playwright/test';
import { login, openDeviceCheck, registerAccount, startSearching } from './support/flows';

test('cancelled queue remains idle, then retry matches a second authenticated participant', async ({ browser, request }) => {
  const firstAccount = await registerAccount(request);
  const secondAccount = await registerAccount(request);
  const firstContext = await browser.newContext({ baseURL: 'http://localhost:3000', permissions: ['camera', 'microphone'] });
  const secondContext = await browser.newContext({ baseURL: 'http://localhost:3000', permissions: ['camera', 'microphone'] });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  try {
    await login(first, firstAccount);
    await login(second, secondAccount);
    await openDeviceCheck(first);
    await startSearching(first);
    await expect(first.getByText(/Waiting for someone with the same topic/i)).toBeVisible();
    await first.getByRole('button', { name: 'Cancel search' }).click();
    await expect(first.getByText(/Search paused/i)).toBeVisible();

    await openDeviceCheck(second);
    await startSearching(second);
    await expect(second.getByText(/Waiting for someone with the same topic/i)).toBeVisible();
    await expect(first.getByText(/Search paused/i)).toBeVisible();
    await first.getByRole('button', { name: 'Resume searching' }).click();
    await expect(first.getByRole('heading', { name: 'Finding your debate partner' })).toHaveCount(0);
    await expect(second.getByRole('heading', { name: 'Finding your debate partner' })).toHaveCount(0);
    await expect(first.getByRole('button', { name: 'End debate' })).toBeVisible();
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});
