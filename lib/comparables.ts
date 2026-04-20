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
//   count=0, median=any                     → "No price data yet" (muted chip, no country/median)
//   count=1–4, median=0, NL                 → "Estimated · 1 NL comparable"
//   count=1–4, median>0, NL                 → "Estimated · 1 NL comparable · median Xd old"
//   count=1–4, median=0, BG                 → "Estimated · N BG comparables"
//   count=5+, median=0, NL                  → "Based on N NL comparables"
//   count=5+, median>0, NL                  → "Based on N NL comparables · median Xd old"
//   count=5+, median>365, NL               → "Based on N NL comparables · median 365d+ old"
//   count=5+, median=0, BG                  → "Based on N BG comparables"
//   count=5+, 0<median≤365, BG             → "Based on N BG comparables · median Xd old"
//   count=5+, median=0, unknown/missing     → "Based on N comparables"   (no country prefix)
//   count=5+, 0<median≤365, unknown/missing → "Based on N comparables · median Xd old"
//   count<0 or median<0                     → treat as 0 (defensive)
//   count NaN / undefined                   → treat as 0 → "No price data yet"
//   median NaN                              → treat as 0 (drop suffix)

// Country codes we render as a prefix today. Anything else falls through to
// generic "comparable(s)" so we never stamp a wrong country on the chip.
const PREFIXABLE_COUNTRIES = new Set(['NL', 'BG']);

export function comparablesChipText(
  count: number | undefined,
  medianAgeDays: number | undefined,
  countryCode?: string | null,
): string {
  // Treat missing/undefined count as 0. NaN > 0 is false, handles NaN without
  // explicit isNaN check. Negatives also collapse to 0.
  const rawCount = typeof count === 'number' ? count : 0;
  const safeCount = rawCount > 0 ? Math.floor(rawCount) : 0;

  if (safeCount === 0) return 'No price data yet';

  const rawMedian = typeof medianAgeDays === 'number' ? medianAgeDays : 0;
  const safeMedian = rawMedian > 0 ? Math.floor(rawMedian) : 0;

  const normalized = (countryCode || '').toUpperCase();
  const prefix = PREFIXABLE_COUNTRIES.has(normalized) ? `${normalized} ` : '';
  const noun = safeCount === 1 ? `${prefix}comparable` : `${prefix}comparables`;

  // 1–4: low-confidence "Estimated ·" prefix; 5+: existing "Based on" copy.
  const isLowConfidence = safeCount <= 4;
  const base = isLowConfidence
    ? `Estimated · ${safeCount} ${noun}`
    : `Based on ${safeCount} ${noun}`;

  if (safeMedian === 0) return base;

  const ageLabel = safeMedian > 365 ? '365d+' : `${safeMedian}d`;
  return `${base} · median ${ageLabel} old`;
}

// Returns a four-level confidence band for the comparables count.
// Used by ListingCard to apply visual modifiers to the evidence chip.
//
//   none   → count = 0     (no price data at all)
//   low    → count 1–4     (few data points, treat as estimate)
//   medium → count 5–19    (reasonable evidence)
//   high   → count 20+     (strong evidence)
export function comparablesConfidenceLevel(
  count: number | undefined,
): 'none' | 'low' | 'medium' | 'high' {
  const raw = typeof count === 'number' && !isNaN(count) ? count : 0;
  const safe = raw > 0 ? Math.floor(raw) : 0;
  if (safe === 0) return 'none';
  if (safe <= 4) return 'low';
  if (safe <= 19) return 'medium';
  return 'high';
}
