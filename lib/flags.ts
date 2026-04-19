// Human-readable labels for risk flags.
// XOL-80: added off_platform_redirect (OLX.bg scam vector).

export const FLAG_LABEL: Record<string, string> = {
  anomaly_price: 'Price anomaly',
  vague_condition: 'Vague condition',
  no_battery_health: 'No battery health info',
  missing_key_photos: 'Few photos',
  no_model_id: 'No model specified',
  unclear_bundle: 'Bundle unclear',
  refurbished_ambiguity: 'Refurb status unclear',
  off_platform_redirect: '⚠ Off-platform contact',
  stale_listing: 'May be sold — check availability',
};

/**
 * Returns a human-readable label for a risk flag key.
 * Falls back to replacing underscores with spaces for unknown flags.
 */
export function flagLabel(flag: string): string {
  return FLAG_LABEL[flag] ?? flag.replace(/_/g, ' ');
}
