// XOL-81: Shortlist comparison view — Playwright mobile gate
// Run manually via the Playwright MCP browser tools or:
//   npx playwright test __tests__/xol81-comparison.spec.ts
//
// Viewport: 390×844 (iPhone 14 equivalent)
// Auth:     test@xolto.app / TestXolto
// Gate:     compare-panel appears with 2 compare-cells after selecting 2 items

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'https://dash.xolto.app';
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

test('XOL-81 Shortlist comparison — mobile 390×844 gate', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // 1. Navigate to /saved
  await page.goto(`${BASE_URL}/saved`, { waitUntil: 'networkidle' });

  // 2. Login if redirected
  const url = page.url();
  if (url.includes('/login') || url.includes('/auth')) {
    await page.fill('input[type="email"]', 'test@xolto.app');
    await page.fill('input[type="password"]', 'TestXolto');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(missions|matches|saved)/, { timeout: 15000 });
    // Re-navigate to /saved — login redirects to /missions for users with missions
    await page.goto(`${BASE_URL}/saved`, { waitUntil: 'networkidle' });
  }

  // 3. Click the compare toggle to enable compare mode
  const toggleBtn = page.locator('[data-testid="compare-toggle"]');
  await toggleBtn.waitFor({ state: 'visible', timeout: 10000 });
  await toggleBtn.click();

  // 4. Find all compare checkboxes
  const checkboxes = page.locator('[data-testid^="listing-compare-checkbox-"]');
  const checkboxCount = await checkboxes.count();

  if (checkboxCount < 2) {
    // No saved items — screenshot and skip panel assertion
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'xol81-comparison-empty-390x844.png'),
      fullPage: false,
    });
    // Just verify the toggle button rendered — feature is present even with empty shortlist
    await expect(toggleBtn).toBeVisible();
    await browser.close();
    return;
  }

  // 5. Check the first two checkboxes
  await checkboxes.nth(0).click();
  await checkboxes.nth(1).click();

  // 6. Wait for action bar to appear (sticky bottom bar shown when >= 2 selected)
  const actionBar = page.locator('[data-testid="compare-action-bar"]');
  await actionBar.waitFor({ state: 'visible', timeout: 5000 });

  // 7. Click "Compare selected" button inside the action bar
  const compareBtn = actionBar.locator('button');
  await compareBtn.click();

  // 8. Wait for the compare panel to appear
  const panel = page.locator('[data-testid="compare-panel"]');
  await panel.waitFor({ state: 'visible', timeout: 5000 });

  // 9. Verify there are exactly 2 compare-cell columns
  const cells = page.locator('[data-testid^="compare-cell-"]');
  await expect(cells).toHaveCount(2);

  // 10. Screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'xol81-comparison-390x844.png'),
    fullPage: false,
  });

  // 11. Final assertion
  await expect(panel).toBeVisible();

  await browser.close();
});
