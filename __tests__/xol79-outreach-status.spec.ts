// XOL-79: Deal state machine (C-6) — Playwright mobile gate
// Run manually via the Playwright MCP browser tools or:
//   npx playwright test __tests__/xol79-outreach-status.spec.ts
//
// Viewport: 390×844 (iPhone 14 equivalent)
// Auth:     test@xolto.app / TestXolto
// Gate:     data-testid="outreach-status-badge" shows "Sent" after first click

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'https://dash.xolto.app';
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

test('XOL-79 Outreach status badge — mobile 390×844 gate', async () => {
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

  // 4. Click the first outreach status button (starts at "Track outreach" / none state)
  const outreachBtn = page.locator('[data-testid="outreach-status-button"]').first();
  await outreachBtn.waitFor({ state: 'visible', timeout: 5000 });
  await outreachBtn.click();

  // 5. Wait for the badge to show "Sent" (optimistic update is instant)
  const badge = page.locator('[data-testid="outreach-status-badge"]').first();
  await badge.waitFor({ state: 'visible', timeout: 10000 });

  // 6. Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'xol79-outreach-status-390x844.png'),
    fullPage: false,
  });

  // 7. Assert badge contains "Sent"
  await expect(badge).toContainText('Sent');

  await browser.close();
});
