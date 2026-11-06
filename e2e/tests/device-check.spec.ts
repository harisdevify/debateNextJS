import { test, expect } from '@playwright/test';
import { login, openDeviceCheck, registerAccount } from './support/flows';

test('preferences survive the device-check step and going back', async ({ page, request }) => {
  await login(page, await registerAccount(request));
  await openDeviceCheck(page, { topic: 'Technology & AI', language: 'Urdu', formal: true });
  await expect(page.getByText(/Technology & AI.*Urdu.*Structured debate/i)).toBeVisible();
  await page.getByRole('button', { name: 'Back to preferences' }).click();
  await expect(page.getByRole('radio', { name: 'Technology & AI' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Urdu' })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Structured debate/i })).toBeChecked();
});

test('fake camera preview is live and device tracks stop when returning', async ({ page, request }) => {
  await login(page, await registerAccount(request));
  await openDeviceCheck(page);
  await page.getByRole('button', { name: /Enable camera & microphone/i }).click();
  await expect(page.getByText('Camera and microphone ready')).toBeVisible();
  const counts = await page.evaluate(() => {
    const video = document.querySelector('video[aria-label="Camera preview"]') as HTMLVideoElement;
    const stream = video.srcObject as MediaStream;
    (window as typeof window & { testTracks?: MediaStreamTrack[] }).testTracks = stream.getTracks();
    return { audio: stream.getAudioTracks().length, video: stream.getVideoTracks().length };
  });
  expect(counts).toEqual({ audio: 1, video: 1 });
  await page.getByRole('button', { name: 'Back to preferences' }).click();
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { testTracks?: MediaStreamTrack[] }).testTracks?.every((track) => track.readyState === 'ended')
  )).toBe(true);
});

test('camera permission failure is recoverable without premature matchmaking', async ({ page, request }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let calls = 0;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (calls++ === 0) throw new DOMException('Permission denied', 'NotAllowedError');
      return original(constraints);
    };
  });
  await login(page, await registerAccount(request));
  await openDeviceCheck(page);
  await page.getByRole('button', { name: /Enable camera & microphone/i }).click();
  await expect(page.getByText(/access was denied/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Finding your debate partner' })).toHaveCount(0);
  await page.getByRole('button', { name: /Enable camera & microphone/i }).click();
  await expect(page.getByText('Camera and microphone ready')).toBeVisible();
});
