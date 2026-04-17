// Pure mapper for the backend-emitted RecommendedAction enum.
// Dash is a dumb presenter: no score-derived logic here — the backend
// owns the 4-way verdict taxonomy (XOL-11). Missing/unknown values
// fall through to `ask_seller` to preserve trust (matches backend
// fallthrough).

import type { RecommendedAction } from './api';

export type ActionVerdictKey = RecommendedAction;

export type ActionVerdict = {
  key: ActionVerdictKey;
  label: string;
  variant: 'buy' | 'negotiate' | 'ask_seller' | 'skip';
};

const DEFAULT_ACTION: ActionVerdictKey = 'ask_seller';

const LABELS: Record<ActionVerdictKey, string> = {
  buy: 'Buy',
  negotiate: 'Negotiate',
  ask_seller: 'Ask seller',
  skip: 'Skip',
};

/** Map the backend enum (or missing/unknown) to a presentation verdict. */
export function actionVerdict(raw: string | undefined | null): ActionVerdict {
  const normalized = normalizeAction(raw);
  return {
    key: normalized,
    label: LABELS[normalized],
    variant: normalized,
  };
}

/** Which CTA button should carry btn-primary emphasis for this action. */
export type ActionCtaKey = 'approve' | 'draft' | 'ask' | 'dismiss';

const CTA_BY_ACTION: Record<ActionVerdictKey, ActionCtaKey> = {
  buy: 'approve',
  negotiate: 'draft',
  ask_seller: 'ask',
  skip: 'dismiss',
};

export function primaryCta(raw: string | undefined | null): ActionCtaKey {
  return CTA_BY_ACTION[normalizeAction(raw)];
}

function normalizeAction(raw: string | undefined | null): ActionVerdictKey {
  if (!raw) return DEFAULT_ACTION;
  switch (raw) {
    case 'buy':
    case 'negotiate':
    case 'ask_seller':
    case 'skip':
      return raw;
    default:
      return DEFAULT_ACTION;
  }
}
