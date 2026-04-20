// XOL-107: Pre-send review modal — Playwright mobile gate
// Run manually:
//   npx playwright test __tests__/xol107-send-review-modal.spec.ts
//
// Viewport: 390×844 (iPhone 14 equivalent)
// Auth:     test@xolto.app / TestXolto
// Gate:     "Review your message" modal opens on Send tap, closes on Cancel

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'https://dash.xolto.app';
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

test('XOL-107 Send review modal — mobile 390×844 gate', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // 1. Navigate to /matches
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

  // 4. Find a card with a draft block — look for the Send button
  //    Cards without a draft will not have [data-testid="send-draft-button"].
  //    If no Send button exists yet, we need to trigger "Draft message" first.
  const sendBtn = page.locator('[data-testid="send-draft-button"]').first();
  const sendBtnCount = await sendBtn.count();

  if (sendBtnCount === 0) {
    // Trigger "Draft message" on the first card that has the button
    const draftBtn = page.locator('button[aria-label="Draft message to seller"]').first();
    await draftBtn.waitFor({ state: 'visible', timeout: 10000 });
    await draftBtn.click();
    // Wait for Send button to appear (draft response may take a few seconds)
    await page.waitForSelector('[data-testid="send-draft-button"]', { timeout: 30000 });
  }

  // 5. Tap "Send" — modal should open
  await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
  await sendBtn.click();

  // 6. Assert modal heading is visible
  const heading = page.locator('h2#srm-title');
  await heading.waitFor({ state: 'visible', timeout: 5000 });
  await expect(heading).toContainText('Review your message');

  // 7. Assert textarea has non-empty text
  const textarea = page.locator('[data-testid="send-review-textarea"]');
  await expect(textarea).toBeVisible();
  const textValue = await textarea.inputValue();
  expect(textValue.trim().length).toBeGreaterThan(0);

  // 8. Assert "Open in OLX" button is present
  const confirmBtn = page.locator('[data-testid="send-review-confirm"]');
  await expect(confirmBtn).toBeVisible();

  // 9. Screenshot — modal open state
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'xol107-send-modal-open-390x844.png'),
    fullPage: false,
  });

  // 10. Tap Cancel — modal should close
  const cancelBtn = page.locator('[data-testid="send-review-cancel"]');
  await cancelBtn.click();

  // 11. Assert modal is gone
  await expect(heading).toBeHidden({ timeout: 3000 });

  // 12. Screenshot — modal closed state
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'xol107-send-modal-closed-390x844.png'),
    fullPage: false,
  });

  await browser.close();
});
