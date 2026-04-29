# xolto-app

`xolto-app` is the authenticated buyer surface for xolto, the mission-first used-electronics buying copilot. It is the Next.js 14 dashboard deployed to Vercel at `dash.xolto.app`. The product is wedged on the high-intent BG used-tech buyer on OLX.bg, with pricing correctness in BGN as a P1 trust constraint (wedge replaced NL / Marktplaats on 2026-04-17; legacy Marktplaats code remains but does not drive product decisions). Every UI decision serves a single JTBD: help a high-intent buyer decide which listings are worth pursuing and recommend one of four actions — Buy, Negotiate, Ask seller, Skip.

This repo owns the authenticated UI only. It is a thin presentation layer: all verdict scoring, pricing, and match logic lives in the [`markt`](https://github.com/TechXTT/xolto) backend behind `api.xolto.app`. This README documents how to run, extend, and verify the dashboard without introducing drift.

## Requirements

- Node.js 18+
- pnpm (CI pins the install via `pnpm install --frozen-lockfile`; local dev uses the same)
- A running xolto API server (`markt` — local on `http://localhost:8000`, or production `api.xolto.app`)

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your backend origin.

## Development

```bash
pnpm dev
```

The app runs on `http://localhost:3000`.

Other scripts (all `pnpm <script>`):

- `lint` — `next lint`
- `typecheck` — `tsc --noEmit`
- `format` / `format:check` — Prettier write / check
- `build` — `next build`
- `start` — `next start` (production build)

CI (`.github/workflows/ci.yml`) runs, in order: `install --frozen-lockfile` → `lint` → `typecheck` → `format:check` → `build`. A PR must be green on all five before merge.

## Environment variables

| Variable                            | Required             | Purpose                                                                                                                                                                                     |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | yes                  | Origin of the markt backend (`lib/api.ts`, `lib/sse.ts`). Defaults to `http://localhost:8000` when unset.                                                                                   |
| `NEXT_PUBLIC_SENTRY_DSN`            | no                   | Client/server/edge Sentry DSN. When unset, `@sentry/nextjs` init is a silent no-op — no errors are sent.                                                                                    |
| `NEXT_PUBLIC_GIT_SHA`               | no                   | Local override for release identifier. Falls through to `VERCEL_GIT_COMMIT_SHA` on Vercel, then `"dev"`. Read by `next.config.mjs` and exposed as `NEXT_PUBLIC_RELEASE` to Sentry.          |
| `VERCEL_GIT_COMMIT_SHA`             | auto                 | Auto-populated by Vercel; feeds the Sentry release tag.                                                                                                                                     |
| `NEXT_PUBLIC_STRIPE_BUYER_PRICE_ID` | yes (for billing UI) | Stripe price ID for the **Buyer** tier checkout button on `/settings` (mid tier; internal slug `pro`). Backward-compat fallback if unset: `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` (deprecated).   |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`   | yes (for billing UI) | Stripe price ID for the **Pro** tier checkout button on `/settings` (top tier; internal slug `power`). Backward-compat fallback if unset: `NEXT_PUBLIC_STRIPE_POWER_PRICE_ID` (deprecated). |

Any additional `process.env.*` reference added in code must be added to this table and to `.env.example`.

## Routes

The App Router tree lives under `app/`. All twelve routes:

Public / auth (`app/(auth)` and root):

- `/` — landing shell, redirects authenticated users to the dashboard
- `/login` — email + password sign-in
- `/register` — account creation with plan-intent capture

Authenticated dashboard (`app/(dashboard)`):

- `/missions` — mission inbox (what the user is actively hunting)
- `/matches` — ranked match feed with presenter-layer chips and verdicts (primary surface)
- `/saved` — saved listings
- `/shortlist` — active shortlist with draft-offer workflow
- `/settings` — account, location, plan (Stripe Buyer / Pro checkout)
- `/feed` — ambient new-listings stream
- `/searches` — saved-search configuration
- `/assistant` — chat surface for buying questions
- `/admin` — admin-only tools (gated server-side)

## Architecture — presenter layer

dash is structured so that the backend owns meaning and the frontend owns presentation. The contract comes in on `/matches` as `{ items: Listing[], ... }` (the `items[]` envelope), and `lib/api.ts` types it. Every rendered chip, verdict, and CTA on a match card is produced by a small pure module in `lib/`:

| File                 | Owns                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- | ------ |
| `lib/api.ts`         | `API_BASE` + all TypeScript types (`Listing`, `SearchSpec`, etc.) + fetch helpers. This is the single source for the `/matches` `items[]` envelope read.     |
| `lib/comparables.ts` | Comparables chip text (e.g. "5 comparables, median 12d old").                                                                                                |
| `lib/musthaves.ts`   | Must-have chip style + glyph per status (match / mismatch / unknown). Consumes `Listing.MustHaves`.                                                          |
| `lib/reason.ts`      | Parses the pipe-separated `Reason` string into structured chips + prose fallback. Tolerates empty/malformed reasons.                                         |
| `lib/verdict.ts`     | Maps `RecommendedAction` → action-verdict label/variant and selects the primary CTA (`ask`, `draft`, `approve`, `dismiss`). Backend-owned verdict enum: `buy | negotiate | ask_seller | skip`. |

`components/ListingCard.tsx` is the single consumer. Each card renders a seven-row chip structure, in order:

1. Evidence row — comparables chip (`data-testid="comparables-chip"`).
2. Must-have row — status chips (`data-testid="musthave-chip-row"`).
3. Reason row — structured reason chips (`data-testid="reason-chip-row"`).
4. Verdict row — `action-verdict` pill + score + confidence.
5. Price row — Ask price vs. fair price.
6. Risk-flags row — risk badges derived from `RiskFlags`.
7. CTA row — `Ask seller` / `Draft seller note` / `Approve` / `Dismiss`.

When adding a new chip, add a pure presenter module in `lib/` and wire it into `ListingCard.tsx`; do not compute meaning inside the component.

## Testing

Unit tests (Jest-less ts-only, executed through CI typecheck / runtime harnesses):

- `__tests__/actionVerdict.test.ts`
- `__tests__/comparablesChip.test.ts`
- `__tests__/musthaves.test.ts`
- `__tests__/reason.test.ts`

**Mobile Playwright MCP gate — MANDATORY on any change to `ListingCard.tsx` or the presenter `lib/` modules.** The gate runs the authenticated flow at viewport **390 × 844** (iPhone 14) and captures a screenshot of `/matches`. A change ships only if the screenshot shows no horizontal overflow, legible chip rows, and working CTAs at that width.

Shared test fixture (see memory `reference_dash_test_account`):

- email: `test@xolto.app`
- password: `TestXolto`
- tier: power (internal slug; user-facing display "Pro" — all features unlocked)

Use this account — do not create ad-hoc fixtures that skew backend telemetry.

## Observability

- Sentry is wired through `instrumentation.ts` (server/edge bootstrap), `instrumentation-client.ts` (browser), and `sentry.{server,edge}.config.ts`.
- All three configs read `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_RELEASE`. When `NEXT_PUBLIC_SENTRY_DSN` is unset, `Sentry.init()` is a silent no-op: no events, no network traffic, no console noise.
- The release tag resolves as `VERCEL_GIT_COMMIT_SHA || NEXT_PUBLIC_GIT_SHA || "dev"`, wired in `next.config.mjs`.
- Sentry requests are tunneled through `/monitoring` to avoid ad-blockers.

## Deployment

- Platform: Vercel, project `dash.xolto.app`.
- Triggers: every push to `main` deploys to production; PRs get preview URLs.
- Env vars are managed in the Vercel project settings — `.env.local` is for local dev only and is gitignored.
- The dashboard depends on `markt` being live at `NEXT_PUBLIC_API_URL`. Backend-first rule: a new contract ships to `api.xolto.app` on Railway before the dash wiring PR merges.

## Related repos

- `markt` (this repo's backend) — [TechXTT/xolto](https://github.com/TechXTT/xolto). Owns verdict scoring, pricing, match pipeline, SSE streams, and the `/matches` contract consumed here.
- `admin.xolto.app` — internal admin surface.
- `www.xolto.app` — marketing landing.

For the `/matches` envelope schema, verdict-scoring rules, and SSE event shapes, read `markt` — do not re-document them here.
