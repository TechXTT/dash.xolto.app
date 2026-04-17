// Pure presenter: converts the `ComparablesCount` + `ComparablesMedianAgeDays`
// fields from the /matches envelope into the evidence-chip copy shown on each
// match card, or null when the chip should not render.
//
// Split out from ListingCard.tsx so the helper is importable by the node
// --test suite without dragging JSX/React into the test runtime. Kept pure
// (no cross-module imports) so Node's native TS runner can load it without
// extension plumbing.
//
// The country prefix on the noun ("NL comparable(s)", "BG comparable(s)",
// or no prefix for unknown markets) is selected by a `countryCode` arg the
// caller derives from the listing's MarketplaceID via
// `marketplaceCountryCode` in lib/marketplace.ts — that map is the single
// source of truth for marketplace → country wiring.
//
// Allowlist (every input shape enumerated):
//
//   count=0, median=any                     → null (don't render chip)
//   count=1, median=0, NL                   → "Based on 1 NL comparable"
//   count=1, median>0, NL                   → "Based on 1 NL comparable · median Xd old"
//   count>1, median=0, NL                   → "Based on N NL comparables"
//   count>1, 0<median≤365, NL               → "Based on N NL comparables · median Xd old"
//   count>1, median>365, NL                 → "Based on N NL comparables · median 365d+ old"
//   count=1, median=0, BG                   → "Based on 1 BG comparable"
//   count>1, median=0, BG                   → "Based on N BG comparables"
//   count>1, 0<median≤365, BG               → "Based on N BG comparables · median Xd old"
//   count>1, median=0, unknown/missing      → "Based on N comparables"   (no country prefix)
//   count>1, 0<median≤365, unknown/missing  → "Based on N comparables · median Xd old"
//   count<0 or median<0                     → treat as 0 (defensive)
//   count NaN / undefined                   → null (don't render)
//   median NaN                              → treat as 0 (drop suffix)

// Country codes we render as a prefix today. Anything else falls through to
// generic "comparable(s)" so we never stamp a wrong country on the chip.
const PREFIXABLE_COUNTRIES = new Set(['NL', 'BG']);

export function comparablesChipText(
  count: number | undefined,
  medianAgeDays: number | undefined,
  countryCode?: string | null,
): string | null {
  // Treat missing/undefined count as 0 → no chip.
  const rawCount = typeof count === 'number' ? count : 0;
  // Defensive: treat negatives and NaN as 0. NaN > 0 is false, so this
  // handles NaN without an explicit isNaN check.
  const safeCount = rawCount > 0 ? Math.floor(rawCount) : 0;
  if (safeCount === 0) return null;

  const rawMedian = typeof medianAgeDays === 'number' ? medianAgeDays : 0;
  const safeMedian = rawMedian > 0 ? Math.floor(rawMedian) : 0;

  const normalized = (countryCode || '').toUpperCase();
  const prefix = PREFIXABLE_COUNTRIES.has(normalized) ? `${normalized} ` : '';
  const noun = safeCount === 1 ? `${prefix}comparable` : `${prefix}comparables`;
  const base = `Based on ${safeCount} ${noun}`;

  if (safeMedian === 0) return base;

  const ageLabel = safeMedian > 365 ? '365d+' : `${safeMedian}d`;
  return `${base} · median ${ageLabel} old`;
}
