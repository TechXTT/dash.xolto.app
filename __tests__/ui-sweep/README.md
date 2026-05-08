# Dash UI Sweep — XOL-177 / XOL-150

Regression baseline for `dash.xolto.app`. Captures full-page screenshots across 8 viewports x 10 routes (80 PNGs total) and asserts no horizontal overflow and no error-boundary renders.

## Cross-repo XOL-171 alignment

This README documents dash's wiring. Sister patterns:

- **xolto-admin** (`admin.xolto.app`): uses `wait-for-vercel-preview` + `VERCEL_AUTOMATION_BYPASS_SECRET`. See `xolto-admin/.github/workflows/admin-ui-sweep.yml` and `xolto-admin/__tests__/ui-sweep/README.md` (source pattern for this file).
- **xolto-landing** (`www.xolto.app`): targets a local production build (`pnpm build && pnpm start`) instead of a deployed preview URL. Structurally avoids chicken-egg without preview-URL plumbing.
- **xolto-app** (`dash.xolto.app`): this repo. Uses `wait-for-vercel-preview` + `VERCEL_AUTOMATION_BYPASS_SECRET` (same shape as admin — XOL-177 completes the third pillar).

## Why this exists

XOL-150 (W19-56) created the sweep spec as a regression baseline and investor-DD prep. XOL-177 wired it into CI so PRs touching dash UI cannot land with sweep failures undetected.

## Required env vars

| Variable                          | Description                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`             | Dash app base URL. On PR runs, automatically set to the Vercel preview URL (XOL-177). Defaults to `https://dash.xolto.app` when unset.                                       |
| `DASH_TEST_EMAIL`                 | Email for the dash test account (normal-user role)                                                                                                                           |
| `DASH_TEST_PASSWORD`              | Password for the dash test account                                                                                                                                           |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel protection-bypass token for preview deployments. Required to reach Vercel preview URLs that are behind Deployment Protection. Omit for local runs against production. |

The test account must be a valid dash user with missions or matches data to exercise assertion coverage on `/matches`.

## Local credentials

Create `.env.test` at the repo root (this file is gitignored — never commit it):

```
# xolto-app/.env.test (LOCAL ONLY - never commit)
PLAYWRIGHT_BASE_URL=https://dash.xolto.app
DASH_TEST_EMAIL=your-account@example.com
DASH_TEST_PASSWORD=your-password
```

Then load it before running the sweep:

```bash
export $(cat .env.test | grep -v '^#' | xargs)
pnpm exec playwright test __tests__/ui-sweep-2026-05.spec.ts --reporter=line
```

Or use `dotenv-cli` if available:

```bash
pnpm exec dotenv -e .env.test -- playwright test __tests__/ui-sweep-2026-05.spec.ts
```

## Running locally

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install chromium

# Run the full sweep (80 tests, 2 workers)
pnpm test:ui-sweep

# Run a single viewport
pnpm exec playwright test __tests__/ui-sweep-2026-05.spec.ts --project=390x844

# Run a single route across all viewports
pnpm exec playwright test __tests__/ui-sweep-2026-05.spec.ts --grep "matches"
```

### Demonstrating the explicit-error path (missing creds)

Run without setting env vars:

```bash
pnpm exec playwright test __tests__/ui-sweep-2026-05.spec.ts --reporter=line
```

Expected: `loginAndSaveState` throws immediately with:
`DASH_TEST_EMAIL / DASH_TEST_PASSWORD env vars required — see __tests__/ui-sweep/README.md`

This is the XOL-177 anti-silent-skip invariant. No test silently passes when creds are absent.

## Updating baselines

Re-run the sweep. The PNGs are overwritten in place. Commit the updated PNGs as a new commit on the PR.

```bash
pnpm test:ui-sweep
git add __tests__/ui-sweep/
git commit -m "chore(dash): update UI sweep baselines"
```

## CI

The workflow at `.github/workflows/dash-ui-sweep.yml` runs on every pull request and on push to main.

### How `PLAYWRIGHT_BASE_URL` resolves in CI (XOL-177)

The workflow uses `patrickedqvist/wait-for-vercel-preview@v1.3.1` to poll Vercel's deployment status API for the commit SHA associated with the PR. Once the preview deployment is live, its URL is piped into `PLAYWRIGHT_BASE_URL` for the Playwright step. This means every PR sweep tests the proposed state of the code (the preview), not the pre-merge production state.

Fallback: if the `wait-for-vercel-preview` step does not produce a URL (e.g., on a direct push to main that bypasses the PR path), `PLAYWRIGHT_BASE_URL` falls back to `https://dash.xolto.app` (production).

### How Vercel Deployment Protection bypass works (XOL-177)

Vercel preview deployments are protected by password or SSO by default. The bypass mechanism uses two HTTP headers injected on every Playwright request:

- `x-vercel-protection-bypass: <secret>` — authenticates the request past Deployment Protection
- `x-vercel-set-bypass-cookie: true` — tells Vercel to set a bypass cookie in the response, so subsequent navigations (after the initial page load) also bypass protection without re-sending the header

`playwright.config.ts` injects these headers via `extraHTTPHeaders` when `VERCEL_AUTOMATION_BYPASS_SECRET` is present. When the secret is absent (local runs against production), the block is empty and no headers are added.

**Required GitHub Secrets** (set in dash repo settings → Secrets → Actions):

- `DASH_TEST_EMAIL` — NEW (XOL-177); email of a test account on dash with normal-user role
- `DASH_TEST_PASSWORD` — NEW (XOL-177)
- `VERCEL_AUTOMATION_BYPASS_SECRET` — NEW (XOL-177); must be set before this PR merges

**How to obtain `VERCEL_AUTOMATION_BYPASS_SECRET`:**
Vercel dashboard → dash.xolto.app project → Settings → Deployment Protection → Protection Bypass for Automation → generate token. Copy the token value and set it as a GitHub Actions secret in the dash repo.

### How to test locally against a preview URL

```bash
PLAYWRIGHT_BASE_URL=https://<your-preview-slug>.vercel.app \
  VERCEL_AUTOMATION_BYPASS_SECRET=<bypass-token> \
  DASH_TEST_EMAIL=your-account@example.com \
  DASH_TEST_PASSWORD=your-password \
  pnpm exec playwright test __tests__/ui-sweep-2026-05.spec.ts --reporter=line --workers=2
```

The bypass headers will be automatically injected by `playwright.config.ts` when `VERCEL_AUTOMATION_BYPASS_SECRET` is set.

## Screenshot layout

```
__tests__/ui-sweep/
  320x568/
    missions-default.png
    missions-structured-form.png
    missions-describe-chat.png
    matches.png
    saved.png
    shortlist.png
    settings.png
    feed.png
    searches.png
    assistant.png
  375x667/
    ... (same 10 files)
  ... (8 viewport directories total)
```

## Auth approach

`loginAndSaveState()` runs once in `test.beforeAll`. It navigates to `/missions`, detects if redirected to `/login`, submits credentials, and persists `storageState` to a temp file. All 80 tests load from that temp file. The file is deleted in `test.afterAll` (contains session tokens).
