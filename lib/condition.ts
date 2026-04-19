// Human-readable labels for the canonical condition enum.
// Canonical values: new | like_new | good | fair | used | for_parts | unknown
// Source: OLX.bg normalizeCondition() in internal/marketplace/olxbg/mapper.go (XOL-40).

const CONDITION_LABEL: Record<string, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  used: 'Used',
  for_parts: 'For parts \u26a0\ufe0f',
  unknown: 'Unknown',
};

export function conditionLabel(condition: string | undefined): string {
  if (!condition) return '—';
  return CONDITION_LABEL[condition] ?? condition.replace(/_/g, ' ');
}
