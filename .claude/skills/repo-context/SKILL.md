# Repo Context — xolto-app (dash.xolto.app)

## What this repo is

Main user-facing application for xolto — an AI copilot for buying used electronics. Users create shopping missions, get AI-matched listings from multiple marketplaces, score deals, save to shortlist, and draft seller messages.

## Stack

- Next.js 14.2.0 (App Router)
- React 18, TypeScript 5.4
- Tailwind CSS v4 (via @tailwindcss/postcss)
- TanStack React Query 5.x for server state
- Sentry for error tracking
- Vercel Analytics
- Font: Outfit via next/font
- Cookie-based auth (credentials: 'include')

## Key routes

```
/(auth)/login        — email/password + Google OAuth
/(auth)/register     — user registration
/(dashboard)/missions   — create/manage shopping missions
/(dashboard)/matches    — AI-matched listings for active mission
/(dashboard)/saved      — shortlist comparisons + offer drafting
/(dashboard)/settings   — account & billing
/(dashboard)/assistant  — AI chat for mission guidance
/(dashboard)/searches   — search configuration management
/(dashboard)/shortlist  — detailed shortlist view
/(dashboard)/feed       — general listing feed
```

## Key files

- `app/(dashboard)/layout.tsx` — dashboard layout, auth guard
- `components/DashboardContext.tsx` — React Context for user, missions, shortlist state
- `components/AssistantChat.tsx` — AI conversation interface
- `components/MissionForm.tsx` — mission creation form
- `components/ListingCard.tsx` — listing display with score/risk
- `components/ShortlistTable.tsx` — comparison table
- `lib/api.ts` — complete API client (auth, missions, searches, listings, matches, shortlist, admin)
- `lib/queries/` — React Query hooks
- `lib/sse.ts` — Server-Sent Events for real-time deal stream

## Auth

- Cookie-based JWT with auto-refresh on 401
- Google OAuth available
- Protected routes wrapped in dashboard layout auth check
- Logout clears state, redirects to /login

## Commands

```
npm run dev         # dev server on port 3000
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run format      # Prettier
```

## Conventions

- Mobile-first required — this is the primary usage context
- Reuse existing components from `components/` before creating new ones
- API calls go through `lib/api.ts` — never use raw fetch in components
- React Query hooks in `lib/queries/` for server state
- Tailwind utility classes; design tokens in globals.css CSS variables
- Mission-first language in all user-facing copy
- Marketplaces: Marktplaats, Vinted (NL/DK), OLX (BG)
- Pricing tiers: Free, Pro (€9/mo), Power (€29/mo)

## Do not

- Break auth/session semantics
- Add desktop-only layouts without mobile equivalent
- Hardcode API URLs — use env vars
- Bypass React Query for data fetching
- Modify Sentry config unless asked

## Definition of done

1. `npm run build` passes
2. Routes still render correctly
3. No layout regression on mobile (iPhone) width
4. Copy uses mission-first language
5. Auth flow remains intact
