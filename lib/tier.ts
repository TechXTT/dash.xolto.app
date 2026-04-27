/* Tier display labels — single source of truth for the xolto-app frontend.
 *
 * CANONICAL SOURCE: markt/internal/billing/limits.go::TierDisplayName.
 * This map mirrors the snapshot at
 * markt/internal/billing/testdata/tier_display_labels.json. When tier labels
 * change, update markt + this file + xolto-landing in lockstep (W19-11).
 *
 * Internal slugs (free/pro/power) stay stable to avoid a DB migration. The
 * W18 (2026-04-25) rename only changed the user-facing display labels:
 *   pro slug   → display "Buyer" (mid tier)
 *   power slug → display "Pro"   (top tier)
 *   free slug  → display "Free"  (starter, unchanged)
 *
 * Unknown slugs fall back to "Free" (fail-safe), matching markt's
 * TierDisplayName behaviour.
 */

export const TIER_DISPLAY_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Buyer',
  power: 'Pro',
};

export function tierDisplayLabel(slug: string | undefined | null): string {
  return TIER_DISPLAY_LABELS[slug ?? ''] ?? 'Free';
}
