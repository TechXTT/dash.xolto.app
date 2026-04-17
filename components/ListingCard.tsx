'use client';

import { useState } from 'react';

import { Listing } from '../lib/api';
import { comparablesChipText } from '../lib/comparables';
import { formatEuroFromCents } from '../lib/format';
import { parseReason } from '../lib/reason';
import { actionVerdict, primaryCta } from '../lib/verdict';

interface Props {
  listing: Listing;
  onShortlist?: (itemID: string) => Promise<void>;
  onDraftOffer?: (itemID: string) => Promise<void>;
  onApprove?: (itemID: string) => Promise<void>;
  onDismiss?: (itemID: string) => Promise<void>;
  draftState?: { loading: boolean; text: string | null };
  isSaved?: boolean;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  marktplaats: 'Marktplaats',
  vinted: 'Vinted',
  vinted_nl: 'Vinted NL',
  vinted_dk: 'Vinted DK',
  olxbg: 'OLX BG',
};

const RISK_FLAG_LABELS: Record<string, string> = {
  anomaly_price: 'Anomaly price',
  vague_condition: 'Vague condition',
  unclear_bundle: 'Unclear bundle',
  no_model_id: 'No model identified',
  missing_key_photos: 'Too few photos',
  no_battery_health: 'Battery health missing',
  refurbished_ambiguity: 'Refurbished details unclear',
};

const QUESTION_ORDER = [
  'anomaly_price',
  'vague_condition',
  'no_battery_health',
  'missing_key_photos',
  'no_model_id',
  'unclear_bundle',
  'refurbished_ambiguity',
] as const;

const FLAG_TO_QUESTION: Record<string, string> = {
  anomaly_price: 'Why is this priced so far below market value?',
  vague_condition: 'Can you describe the exact condition in more detail?',
  no_battery_health: "What's the current battery health percentage?",
  missing_key_photos: 'Could you share close-up photos of the item?',
  no_model_id: 'Which exact model or variant is this?',
  unclear_bundle: 'What exactly is included in this bundle?',
  refurbished_ambiguity: 'Is this seller-refurbished or manufacturer-refurbished?',
};

export function ListingCard({
  listing,
  onShortlist,
  onDraftOffer,
  onApprove,
  onDismiss,
  draftState,
  isSaved = false,
}: Props) {
  const item = listing;
  const score = (listing.Score ?? 0) > 0 ? listing.Score : undefined;
  const fairPrice = (listing.FairPrice ?? 0) > 0 ? listing.FairPrice : undefined;
  const confidence = listing.Confidence ?? 0;
  const reason = listing.Reason || undefined;
  const verdict = actionVerdict(listing.RecommendedAction);
  const primary = primaryCta(listing.RecommendedAction);
  const confidenceLabel = confidenceCopy(confidence);
  const suggestedQuestion = firstSuggestedQuestion(listing.RiskFlags ?? []);
  const feedback = listing.Feedback ?? '';
  const comparablesText = comparablesChipText(
    listing.ComparablesCount,
    listing.ComparablesMedianAgeDays,
  );
  // Reason may be empty or malformed (no "|" separator); in that case
  // `chips` is empty and we fall back to the raw reason text so nothing is lost.
  const parsedReason = parseReason(reason ?? '');
  const hasReasonChips = parsedReason.chips.length > 0;

  const [saving, setSaving] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);

  async function handleShortlist() {
    if (!onShortlist || saving || isSaved) return;
    setSaving(true);
    try {
      await onShortlist(item.ItemID);
    } finally {
      setSaving(false);
    }
  }

  async function handleDraftOffer() {
    if (!onDraftOffer || draftState?.loading) return;
    await onDraftOffer(item.ItemID);
  }

  async function handleApprove() {
    if (!onApprove || feedbackPending || feedback === 'approved') return;
    setFeedbackPending(true);
    try {
      await onApprove(item.ItemID);
    } finally {
      setFeedbackPending(false);
    }
  }

  async function handleDismiss() {
    if (!onDismiss || feedbackPending) return;
    setFeedbackPending(true);
    try {
      await onDismiss(item.ItemID);
    } finally {
      setFeedbackPending(false);
    }
  }

  return (
    <article className="listing-card">
      <div className="listing-media">
        {item.ImageURLs?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.ImageURLs[0]} alt={item.Title} className="listing-image" />
        ) : (
          <div className="listing-image listing-image-fallback">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-600)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="listing-content">
        <div className="listing-head">
          <div className="listing-copy">
            <div className="listing-meta-row">
              {item.MarketplaceID && (
                <span className="market-badge">
                  {MARKETPLACE_LABELS[item.MarketplaceID] || item.MarketplaceID}
                </span>
              )}
              {item.Condition && <span className="subtle-pill">{item.Condition}</span>}
            </div>
            <a
              href={item.URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="listing-title"
            >
              {item.Title}
            </a>
            <div className="listing-meta-row" style={{ marginTop: 8 }}>
              <span
                className={`action-verdict action-verdict-${verdict.variant}`}
                data-action={verdict.key}
              >
                {verdict.label}
              </span>
              {score !== undefined && <span className="subtle-pill">Score {score.toFixed(1)}</span>}
              <span className="subtle-pill">{confidenceLabel}</span>
              {feedback === 'approved' && <span className="approved-badge">Approved</span>}
            </div>
            {comparablesText && (
              <div className="listing-evidence-row">
                <span className="evidence-chip" data-testid="comparables-chip">
                  {comparablesText}
                </span>
              </div>
            )}
            {hasReasonChips && (
              <div
                className="listing-evidence-row listing-reason-chip-row"
                data-testid="reason-chip-row"
              >
                {parsedReason.chips.map((chip, idx) => (
                  <span
                    key={`${chip.kind}-${idx}`}
                    className="evidence-chip"
                    data-reason-kind={chip.kind}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {onShortlist && (
            <button
              type="button"
              className={`save-chip${isSaved ? ' saved' : ''}`}
              onClick={handleShortlist}
              disabled={saving || isSaved}
            >
              {isSaved ? 'Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>

        <div className="listing-price-row">
          <span className="listing-price">Ask: {formatEuroFromCents(item.Price)}</span>
          <span className="price-caption">
            Fair: {fairPrice ? formatEuroFromCents(fairPrice) : 'Unknown'}
          </span>
        </div>

        {reason &&
          (hasReasonChips ? (
            parsedReason.prose && (
              <p className="listing-reason listing-reason-prose" data-testid="reason-prose">
                {parsedReason.prose}
              </p>
            )
          ) : (
            <p className="listing-reason">{reason}</p>
          ))}
        {(item.RiskFlags?.length ?? 0) > 0 && (
          <div className="risk-flags">
            {item.RiskFlags!.map((flag) => (
              <span key={flag} className="risk-flag">
                {RISK_FLAG_LABELS[flag] ?? flag}
              </span>
            ))}
          </div>
        )}
        {suggestedQuestion && <p className="shortlist-question">Ask seller: {suggestedQuestion}</p>}
        <div className="shortlist-actions">
          {item.URL && (
            <a
              href={item.URL}
              target="_blank"
              rel="noopener noreferrer"
              className={primary === 'ask' ? 'btn-primary' : 'btn-secondary'}
              aria-selected={primary === 'ask' ? true : undefined}
            >
              Ask seller
            </a>
          )}
          {onDraftOffer && (
            <button
              type="button"
              className={primary === 'draft' ? 'btn-primary' : 'btn-secondary'}
              aria-selected={primary === 'draft' ? true : undefined}
              onClick={() => void handleDraftOffer()}
              disabled={draftState?.loading}
            >
              {draftState?.loading ? 'Drafting...' : 'Draft seller note'}
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              className={`btn-approve${feedback === 'approved' ? ' active' : ''}${primary === 'approve' ? ' is-primary' : ''}`}
              aria-selected={primary === 'approve' ? true : undefined}
              onClick={() => void handleApprove()}
              disabled={feedbackPending || feedback === 'approved'}
              title="Approve this match — future matches will lean on it as a ground-truth example"
            >
              {feedback === 'approved' ? '✓ Approved' : 'Approve'}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              className={`btn-dismiss${primary === 'dismiss' ? ' is-primary' : ''}`}
              aria-selected={primary === 'dismiss' ? true : undefined}
              onClick={() => void handleDismiss()}
              disabled={feedbackPending}
              title="Dismiss — hide this match and avoid similar ones"
            >
              Dismiss
            </button>
          )}
        </div>
        {draftState?.text && (
          <div className="offer-draft-block">
            <p>{draftState.text}</p>
            <button
              type="button"
              className="btn-copy"
              onClick={() => {
                if (!draftState.text) return;
                void navigator.clipboard.writeText(draftState.text);
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function confidenceCopy(confidence: number) {
  if (confidence >= 0.75) return 'High confidence';
  if (confidence >= 0.4) return 'Medium confidence';
  return 'Low confidence';
}

function firstSuggestedQuestion(riskFlags: string[]) {
  for (const flag of QUESTION_ORDER) {
    if (riskFlags.includes(flag)) {
      return FLAG_TO_QUESTION[flag];
    }
  }
  return 'Can you confirm condition and included accessories?';
}
