# Mobile Pass — xolto-app

Use this skill to validate and improve mobile UX across the dashboard. xolto is mobile-first — most users browse deals on their phone.

## Review checklist

### Layout fundamentals

- No horizontal overflow at 375px (iPhone SE) or 390px (iPhone 14)
- No fixed-width elements that exceed viewport
- Touch targets are at least 44x44px
- Adequate spacing between tappable elements (no accidental taps)

### Navigation & actions

- Primary actions (Save, Skip, Ask seller) are visible without scrolling
- Use sticky bottom action bars for key flows
- Bottom sheets preferred over side panels for detail views
- Back navigation is clear and accessible

### Cards & listings

- ListingCard is verdict-first: score and price visible immediately
- Evidence/details accessible via expand or bottom sheet, not inline dump
- Card density appropriate — not too cramped, not too sparse
- Images sized appropriately for mobile (no oversized downloads)

### Forms & inputs

- Input fields are full-width on mobile
- Keyboard type matches input (email, number, etc.)
- Form submit buttons are prominent and reachable
- MissionForm steps are clear on small screens

### Dashboard routes to check

- `/missions` — mission cards stack, create button accessible
- `/matches` — listing cards readable, actions reachable
- `/saved` — shortlist usable without wide table layout
- `/settings` — all settings accessible, billing CTAs clear
- `/assistant` — chat interface works at mobile width
- `/searches` — search config forms usable
- `/feed` — listing feed scrolls smoothly

### Patterns to avoid

- Table layouts on mobile (use cards or stacked lists instead)
- Side-by-side panels that assume desktop width
- Hover-dependent interactions (no hover on mobile)
- Modals that don't fit mobile viewport
- Text truncation that hides critical information (scores, prices)

## After review

1. List issues found with file, line, and screenshot/width reference
2. Fix each issue, preferring CSS/Tailwind changes over structural rewrites
3. Run `npm run build` to verify
4. Check each affected route at 375px width in dev server
