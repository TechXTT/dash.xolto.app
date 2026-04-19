// XOL-74: Reply Copilot Phase 2 — Playwright mobile gate
// Run manually via the Playwright MCP browser tools or:
//   npx playwright test __tests__/xol74-reply-copilot-mobile.spec.ts
//
// Viewport: 390×844 (iPhone 14 equivalent)
// Auth:     test@xolto.app / TestXolto
// Gate:     data-testid="reply-draft-message" appears after submit

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'https://dash.xolto.app';
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

test('XOL-74 Reply Copilot — mobile 390×844 gate', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // 1. Navigate to matches
  await page.goto(`${BASE_URL}/matches`, { waitUntil: 'networkidle' });

  // 2. Login if redirected
  const url = page.url();
  if (url.includes('/login') || url.includes('/auth')) {
    await page.fill('input[type="email"]', 'test@xolto.app');
    await page.fill('input[type="password"]', 'TestXolto');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/matches`, { timeout: 15000 });
  }

  // 3. Wait for at least one listing card
  await page.waitForSelector('.listing-card', { timeout: 20000 });

  // 4. Click the first "Seller replied?" button
  const replyBtn = page.locator('.reply-copilot-btn').first();
  await replyBtn.click();

  // 5. Wait for the textarea to appear and fill it
  const textarea = page.locator('.reply-copilot-textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill('I can come down a little, what did you have in mind?');

  // 6. Click "Interpret reply"
  const interpretBtn = page.locator('button:has-text("Interpret reply")').first();
  await interpretBtn.click();

  // 7. Wait for reply-draft-message to appear
  const draftMsg = page.locator('[data-testid="reply-draft-message"]').first();
  await draftMsg.waitFor({ state: 'visible', timeout: 30000 });

  // 8. Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'xol74-reply-copilot-390x844.png'),
    fullPage: false,
  });

  // 9. Assert element exists
  await expect(draftMsg).toBeVisible();

  await browser.close();
});
