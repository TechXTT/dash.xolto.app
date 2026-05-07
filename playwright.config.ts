// XOL-177: Dash UI sweep config — mirrors admin playwright.config.ts shape (XOL-171).
// Admin-specific differences noted inline.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Spec file for the dash sweep
  testMatch: '__tests__/ui-sweep-2026-05.spec.ts',

  // Playwright runtime artifacts (traces, .last-run.json, failure screenshots) go here.
  // MUST NOT be test-results/ — the Class-8 gate treats any content in test-results/ as
  // evidence of a failed test. Keep this path in sync with .gitignore and dash-ui-sweep.yml.
  outputDir: 'playwright-failures',

  use: {
    // baseURL is set via env; falls back to production dash URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://dash.xolto.app',

    // Headless Chromium — consistent with admin shape
    browserName: 'chromium',
    headless: true,

    ignoreHTTPSErrors: false,

    // XOL-177 (mirroring XOL-171 admin pattern): Vercel Deployment Protection
    // bypass for preview URLs. When VERCEL_AUTOMATION_BYPASS_SECRET is set (CI on PRs),
    // inject the bypass headers so Playwright can reach the password-protected preview
    // deployment. x-vercel-set-bypass-cookie ensures Playwright's storageState picks up
    // the bypass cookie, keeping subsequent navigations authenticated past the initial fetch.
    // Length check defends against empty-string env (misconfigured GitHub Secret /
    // accidental empty .env): empty string would inject empty bypass header → Vercel
    // 401 with confusing "auth misconfigured" failure mode rather than the cleaner
    // "secret unset → fall through to prod" path.
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET &&
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET.length > 0
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
            'x-vercel-set-bypass-cookie': 'true',
          },
        }
      : {}),
  },

  // 8 viewports: mobile → tablet → desktop
  // Names drive the screenshot directory slug: __tests__/ui-sweep/<name>/<route-slug>.png
  projects: [
    { name: '320x568', use: { viewport: { width: 320, height: 568 } } },
    { name: '375x667', use: { viewport: { width: 375, height: 667 } } },
    { name: '390x844', use: { viewport: { width: 390, height: 844 } } },
    { name: '414x896', use: { viewport: { width: 414, height: 896 } } },
    { name: '430x932', use: { viewport: { width: 430, height: 932 } } },
    { name: '768x1024', use: { viewport: { width: 768, height: 1024 } } },
    { name: '1024x768', use: { viewport: { width: 1024, height: 768 } } },
    { name: '1280x720', use: { viewport: { width: 1280, height: 720 } } },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-junit/junit.xml' }],
  ],
});
