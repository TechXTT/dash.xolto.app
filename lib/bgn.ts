// Bulgarian-currency primitives — peg const, BGN formatter, and the OLX-BG
// marketplace detector used to decide whether a listing renders with BGN as
// the primary headline.
//
// Kept in its own zero-import leaf module so it loads under the Node
// `--test` harness (native TS) without dragging lib/api.ts or lib/marketplace
// along. When a second BG marketplace is added, update BOTH this list and
// `lib/marketplace.ts` MARKETPLACE_OPTIONS.

// Fixed Bulgarian currency-board peg. Law-fixed since 1999, unchanged since
// 2002 (BGN:EUR = 1.95583). Hard-coded on purpose — this is NOT a live FX
// rate and must not be fetched dynamically.
export const EUR_TO_BGN_PEG = 1.95583 as const;

const bgnFormatterCache = new Map<string, Intl.NumberFormat>();

function getBgnFormatter(locale: string): Intl.NumberFormat {
  const cached = bgnFormatterCache.get(locale);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  bgnFormatterCache.set(locale, fmt);
  return fmt;
}

// formatBGNFromEuroCents converts EUR-cents → BGN (whole лв) using the fixed
// peg EUR_TO_BGN_PEG. Rendered with bg-BG locale to match how OLX BG sellers
// list prices. Internal storage stays in EUR cents everywhere; this function
// is purely for display.
export function formatBGNFromEuroCents(cents: number, fallback = '—'): string {
  if (!Number.isFinite(cents) || cents <= 0) return fallback;
  const bgn = (cents / 100) * EUR_TO_BGN_PEG;
  return getBgnFormatter('bg-BG').format(bgn);
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
