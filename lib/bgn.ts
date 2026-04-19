// Bulgarian-currency primitives — peg const, EUR+BGN formatter, and the OLX-BG
// marketplace detector.
//
// Kept in its own zero-import leaf module so it loads under the Node
// `--test` harness (native TS) without dragging lib/api.ts or lib/marketplace
// along. When a second BG marketplace is added, update BOTH this list and
// `lib/marketplace.ts` MARKETPLACE_OPTIONS.

// Fixed Bulgarian currency-board peg. Law-fixed since 1999, unchanged since
// 2002 (BGN:EUR = 1.95583). Hard-coded on purpose — this is NOT a live FX
// rate and must not be fetched dynamically.
export const EUR_TO_BGN_PEG = 1.95583 as const;

// formatBGNFromEuroCents formats a EUR-cents amount for Bulgarian listings.
// Bulgaria adopted EUR on 2026-01-01; EUR is shown primary with BGN in
// parentheses for familiarity. Uses the fixed peg EUR_TO_BGN_PEG.
export function formatBGNFromEuroCents(cents: number, fallback = '—'): string {
  if (!Number.isFinite(cents) || cents <= 0) return fallback;
  const eur = cents / 100;
  const bgn = Math.round(eur * EUR_TO_BGN_PEG);
  return `€${eur.toFixed(2)} (${bgn} лв.)`;
}

// isBulgarianMarketplace returns true when the marketplace id is a BG-country
// market. Canonical id is `olxbg` per lib/marketplace.ts MARKETPLACE_OPTIONS;
// the other two are defensive in case upstream ingest ever normalizes
// differently.
export function isBulgarianMarketplace(marketplaceId?: string | null): boolean {
  if (!marketplaceId) return false;
  const id = marketplaceId.trim().toLowerCase();
  return id === 'olxbg' || id === 'olx-bg' || id === 'olx.bg';
}
