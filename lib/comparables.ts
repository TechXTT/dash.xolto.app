// XOL-16 v0.8 — "Fair price, visibly earned."
//
// Pure presenter: converts the `ComparablesCount` + `ComparablesMedianAgeDays`
// fields from the /matches envelope into the evidence-chip copy shown on each
// match card, or null when the chip should not render.
//
// Split out from ListingCard.tsx so the helper is importable by the node
// --test suite without dragging JSX/React into the test runtime.
//
// Allowlist (every input shape enumerated, per subagent_brief_allowlists):
//
//   count=0, median=any        → null (don't render chip)
//   count=1, median=0          → "Based on 1 NL comparable"
//   count=1, median>0          → "Based on 1 NL comparable · median Xd old"
//   count>1, median=0          → "Based on N NL comparables"
//   count>1, 0<median≤365      → "Based on N NL comparables · median Xd old"
//   count>1, median>365        → "Based on N NL comparables · median 365d+ old"
//   count<0 or median<0        → treat as 0 (defensive)
//   count NaN / undefined      → null (don't render)
//   median NaN                 → treat as 0 (drop suffix)
//
// "NL" is hardcoded — we're in the NL/Marktplaats wedge per strategy memo.
// Do not try to derive country from the item's marketplace field.

export function comparablesChipText(
  count: number | undefined,
  medianAgeDays: number | undefined,
): string | null {
  // Treat missing/undefined count as 0 → no chip.
  const rawCount = typeof count === 'number' ? count : 0;
  // Defensive: treat negatives and NaN as 0. NaN > 0 is false, so this
  // handles NaN without an explicit isNaN check.
  const safeCount = rawCount > 0 ? Math.floor(rawCount) : 0;
  if (safeCount === 0) return null;

  const rawMedian = typeof medianAgeDays === 'number' ? medianAgeDays : 0;
  const safeMedian = rawMedian > 0 ? Math.floor(rawMedian) : 0;

  const noun = safeCount === 1 ? 'NL comparable' : 'NL comparables';
  const base = `Based on ${safeCount} ${noun}`;

  if (safeMedian === 0) return base;

  const ageLabel = safeMedian > 365 ? '365d+' : `${safeMedian}d`;
  return `${base} · median ${ageLabel} old`;
}
