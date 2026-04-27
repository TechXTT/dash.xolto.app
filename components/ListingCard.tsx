'use client';

import { useState } from 'react';

import { api, Listing, OutreachStatus, ReplyCopilotResponse } from '../lib/api';
import { comparablesChipText, comparablesConfidenceLevel } from '../lib/comparables';
import { formatBGNFromEuroCents, formatEuroFromCents, isBulgarianMarketplace } from '../lib/format';
import { marketplaceCountryCode } from '../lib/marketplace';
import { mustHaveChipStyle } from '../lib/musthaves';
import { parseReason } from '../lib/reason';
import { actionVerdict, primaryCta } from '../lib/verdict';
import { flagLabel } from '../lib/flags';
import { CurrencyStatusBadge } from './CurrencyStatusBadge';
import { SendReviewModal } from './SendReviewModal';

interface Props {
  listing: Listing;
  onShortlist?: (itemID: string) => Promise<void>;
  onDraftOffer?: (itemID: string) => Promise<void>;
  onApprove?: (itemID: string) => Promise<void>;
  onDismiss?: (itemID: string) => Promise<void>;
  draftState?: {
    loading: boolean;
    text: string | null;
    questions?: string[];
    offer_price?: number;
    lang?: 'bg' | 'nl' | 'en';
  };
  isSaved?: boolean;
  missionId?: number;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  marktplaats: 'Marktplaats',
  vinted: 'Vinted',
  vinted_nl: 'Vinted NL',
  vinted_dk: 'Vinted DK',
  olxbg: 'OLX BG',
};

// FLAG_LABEL and flagLabel are sourced from lib/flags.ts (XOL-80).
// RISK_FLAG_LABELS kept as a legacy alias; new code uses flagLabel() directly.

const QUESTION_ORDER = [
  'off_platform_redirect',
  'anomaly_price',
  'vague_condition',
  'no_battery_health',
  'missing_key_photos',
  'no_model_id',
  'unclear_bundle',
  'refurbished_ambiguity',
] as const;

const FLAG_TO_QUESTION: Record<string, string> = {
  off_platform_redirect: 'Why are you asking me to contact you outside OLX.bg?',
  anomaly_price: 'Why is this priced so far below market value?',
  vague_condition: 'Can you describe the exact condition in more detail?',
  no_battery_health: "What's the current battery health percentage?",
  missing_key_photos: 'Could you share close-up photos of the item?',
  no_model_id: 'Which exact model or variant is this?',
  unclear_bundle: 'What exactly is included in this bundle?',
  refurbished_ambiguity: 'Is this seller-refurbished or manufacturer-refurbished?',
};

// Internal scorer labels that must never render as user-facing text (XOL-95).
const INTERNAL_REASON_LABELS = new Set(['accessory pre-filtered', 'market-average fallback']);

export function ListingCard({
  listing,
  onShortlist,
  onDraftOffer,
  onApprove,
  onDismiss,
  draftState,
  isSaved = false,
  missionId,
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
  const listingCountry = marketplaceCountryCode(listing.MarketplaceID);
  const comparablesText = comparablesChipText(
    listing.ComparablesCount,
    listing.ComparablesMedianAgeDays,
    listingCountry,
  );
  const comparablesLevel = comparablesConfidenceLevel(listing.ComparablesCount);
  // Reason may be empty or malformed (no "|" separator); in that case
  // `chips` is empty and we fall back to the raw reason text so nothing is lost.
  const parsedReason = parseReason(reason ?? '');
  const hasReasonChips = parsedReason.chips.length > 0;
  // MustHaves may be missing on older cached responses → coalesce to [] so the
  // chip row is simply hidden rather than crashing on .length of undefined.
  const mustHaves = listing.MustHaves ?? [];

  const [saving, setSaving] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);

  // XOL-79: Outreach deal-state machine
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>(
    listing.OutreachStatus ?? 'none',
  );
  const [outreachPending, setOutreachPending] = useState(false);

  // XOL-107: Pre-send review modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendToast, setSendToast] = useState(false);

  // Phase 2: Reply Copilot state
  const [replyPanelOpen, setReplyPanelOpen] = useState(false);
  const [sellerReply, setSellerReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyResult, setReplyResult] = useState<ReplyCopilotResponse | null>(null);
  const [replyError, setReplyError] = useState('');

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

  async function handleInterpretReply() {
    if (!sellerReply.trim() || replyLoading) return;
    setReplyLoading(true);
    setReplyError('');
    setReplyResult(null);
    try {
      const result = await api.shortlist.replyCopilot({
        listing_id: item.ItemID,
        seller_reply: sellerReply,
        mission_id: missionId && missionId > 0 ? missionId : 0,
        our_offer_price: draftState?.offer_price ?? 0,
        verdict: (listing.RecommendedAction as string) || '',
      });
      setReplyResult(result);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to interpret reply');
    } finally {
      setReplyLoading(false);
    }
  }

  // XOL-79: cycle none→sent→replied→won→lost→none
  const OUTREACH_CYCLE: OutreachStatus[] = ['none', 'sent', 'replied', 'won', 'lost'];
  async function handleOutreachCycle() {
    if (outreachPending) return;
    const nextIndex = (OUTREACH_CYCLE.indexOf(outreachStatus) + 1) % OUTREACH_CYCLE.length;
    const nextStatus = OUTREACH_CYCLE[nextIndex];
    const prevStatus = outreachStatus;
    setOutreachStatus(nextStatus);
    setOutreachPending(true);
    try {
      await api.matches.patchOutreachStatus(item.ItemID, nextStatus);
    } catch {
      setOutreachStatus(prevStatus);
    } finally {
      setOutreachPending(false);
    }
  }

  // W18-6: Skip is the "walk away" verdict; mute the whole card so it stops
  // blending into the other three. Pill itself is restyled in CSS via the
  // existing `action-verdict-skip` class.
  const isSkip = verdict.key === 'skip';

  return (
    <article
      className={`listing-card${isSkip ? ' listing-card--skip' : ''}`}
      data-verdict={verdict.key}
    >
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
                <span
                  className={`evidence-chip${comparablesLevel === 'none' ? ' evidence-chip--muted' : comparablesLevel === 'low' ? ' evidence-chip--warning' : ''}`}
                  data-testid="comparables-chip"
                >
                  {comparablesText}
                </span>
              </div>
            )}
            {mustHaves.length > 0 && (
              <div
                className="listing-evidence-row listing-musthave-chip-row"
                data-testid="musthave-chip-row"
              >
                {mustHaves.map((mh, idx) => {
                  const style = mustHaveChipStyle(mh.Status);
                  return (
                    <span
                      key={`${style.status}-${idx}-${mh.Text}`}
                      className="evidence-chip musthave-chip"
                      data-musthave-status={style.status}
                    >
                      <span aria-hidden="true" className="musthave-chip-glyph">
                        {style.glyph}
                      </span>{' '}
                      {mh.Text}
                    </span>
                  );
                })}
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

        {isBulgarianMarketplace(item.MarketplaceID) ? (
          <>
            <div className="listing-price-row">
              <span className="listing-price" data-testid="listing-price-bgn">
                Ask: {formatBGNFromEuroCents(item.Price)}
              </span>
              <span className="price-caption">
                Fair: {fairPrice ? formatBGNFromEuroCents(fairPrice) : 'Unknown'}
              </span>
            </div>
            <p className="price-conversion-caption" data-testid="price-eur-caption">
              ≈ {formatEuroFromCents(item.Price, '—', item.MarketplaceID)}
              {fairPrice
                ? ` · fair ${formatEuroFromCents(fairPrice, '—', item.MarketplaceID)}`
                : ''}
            </p>
            <div className="listing-evidence-row listing-currency-status-row">
              <CurrencyStatusBadge status={item.CurrencyStatus} />
            </div>
          </>
        ) : (
          <div className="listing-price-row">
            <span className="listing-price">
              Ask: {formatEuroFromCents(item.Price, '—', item.MarketplaceID)}
            </span>
            <span className="price-caption">
              Fair:{' '}
              {fairPrice ? formatEuroFromCents(fairPrice, '—', item.MarketplaceID) : 'Unknown'}
            </span>
          </div>
        )}

        {reason &&
          !INTERNAL_REASON_LABELS.has(reason) &&
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
              <span key={flag} className="risk-flag" data-flag={flag}>
                {flagLabel(flag)}
              </span>
            ))}
          </div>
        )}
        {daysAgo(item.Date) !== null && (
          <span className="text-xs text-muted-foreground">Last seen {daysAgo(item.Date)}d ago</span>
        )}
        {item.RiskFlags?.includes('off_platform_redirect') && (
          <div className="scam-warning-banner" data-testid="scam-warning-banner">
            ⚠ This seller is asking you to communicate outside OLX.bg — a common scam pattern.
            Proceed with extreme caution.
          </div>
        )}
        {suggestedQuestion && <p className="shortlist-question">Ask seller: {suggestedQuestion}</p>}
        {/* XOL-79: Outreach status badge — visible when status != none */}
        <OutreachStatusBadge
          status={outreachStatus}
          pending={outreachPending}
          onCycle={() => void handleOutreachCycle()}
        />
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
              aria-label="Draft message to seller"
              aria-selected={primary === 'draft' ? true : undefined}
              onClick={() => void handleDraftOffer()}
              disabled={draftState?.loading}
            >
              {draftState?.loading ? 'Drafting...' : 'Draft message'}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost reply-copilot-btn"
            onClick={() => {
              setReplyPanelOpen((v) => !v);
              setReplyResult(null);
              setReplyError('');
            }}
          >
            Seller replied?
          </button>
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
        {outreachStatus === 'sent' && listing.OutreachSentAt && (
          <OutreachSentChip sentAt={listing.OutreachSentAt} />
        )}
        {draftState?.text && (
          <div className="offer-draft-block">
            <p>{draftState.text}</p>
            {(draftState.offer_price ?? 0) > 0 && (
              <p className="draft-offer-price">
                Suggested offer:{' '}
                {draftState.lang === 'bg'
                  ? `€${((draftState.offer_price ?? 0) / 100).toFixed(2)} (${(((draftState.offer_price ?? 0) / 100) * 1.95583).toFixed(0)} лв.)`
                  : `€${((draftState.offer_price ?? 0) / 100).toFixed(2)}`}
              </p>
            )}
            {(draftState.questions?.length ?? 0) > 0 && (
              <div className="draft-questions" data-testid="draft-questions">
                <p className="draft-questions-label">Questions to include:</p>
                <ol className="draft-questions-list">
                  {draftState.questions!.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
            <button
              type="button"
              className="btn-send"
              data-testid="send-draft-button"
              onClick={() => setSendModalOpen(true)}
            >
              Send
            </button>
          </div>
        )}
        {sendModalOpen && draftState?.text && (
          <SendReviewModal
            draftText={draftState.text}
            itemURL={item.URL || '#'}
            itemTitle={item.Title}
            offerPrice={draftState.offer_price}
            offerLang={draftState.lang}
            questions={draftState.questions}
            onConfirm={() => {
              setSendModalOpen(false);
              void api.matches.patchOutreachStatus(item.ItemID, 'sent').catch(() => null);
              setSendToast(true);
              setTimeout(() => setSendToast(false), 2800);
            }}
            onCancel={() => setSendModalOpen(false)}
          />
        )}
        {sendToast && (
          <div className="xol107-toast" role="status" data-testid="send-toast">
            Message copied — paste it in OLX chat
          </div>
        )}
        {replyPanelOpen && (
          <div className="reply-copilot-panel">
            <div className="reply-copilot-panel-header">
              <span className="reply-copilot-panel-title">Interpret seller reply</span>
              <button
                type="button"
                className="reply-copilot-close"
                aria-label="Close reply panel"
                onClick={() => {
                  setReplyPanelOpen(false);
                  setReplyResult(null);
                  setReplyError('');
                  setSellerReply('');
                }}
              >
                ✕
              </button>
            </div>
            <label className="reply-copilot-label" htmlFor={`seller-reply-${item.ItemID}`}>
              Paste seller reply
            </label>
            <textarea
              id={`seller-reply-${item.ItemID}`}
              className="reply-copilot-textarea"
              rows={3}
              placeholder="Paste the seller's reply here…"
              value={sellerReply}
              onChange={(e) => setSellerReply(e.target.value)}
              disabled={replyLoading}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleInterpretReply()}
              disabled={replyLoading || !sellerReply.trim()}
            >
              {replyLoading ? (
                <>
                  <span className="reply-copilot-spinner" aria-hidden="true" />
                  Interpreting…
                </>
              ) : (
                'Interpret reply'
              )}
            </button>
            {replyError && <p className="reply-copilot-error">{replyError}</p>}
            {replyResult && (
              <div className="reply-copilot-result">
                <div className="reply-copilot-interpretation">
                  <InterpretationBadge interpretation={replyResult.interpretation} />
                </div>
                <p className="reply-copilot-action">
                  <RecommendedActionLabel
                    action={replyResult.recommended_action}
                    offerPrice={replyResult.offer_price}
                  />
                </p>
                {replyResult.confidence === 'low' && (
                  <div className="reply-copilot-amber-banner">
                    Reply is ambiguous — review carefully before responding.
                  </div>
                )}
                <div className="reply-copilot-draft-block">
                  <pre className="reply-copilot-draft-text" data-testid="reply-draft-message">
                    {replyResult.draft_next_message}
                  </pre>
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={() => {
                      void navigator.clipboard.writeText(replyResult.draft_next_message);
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// XOL-79: Outreach status badge sub-component
const OUTREACH_LABELS: Record<OutreachStatus, string> = {
  none: '',
  sent: 'Sent',
  replied: 'Replied',
  won: 'Won \u2713',
  lost: 'Lost',
};

function OutreachStatusBadge({
  status,
  pending,
  onCycle,
}: {
  status: OutreachStatus;
  pending: boolean;
  onCycle: () => void;
}) {
  const label = OUTREACH_LABELS[status] ?? '';
  return (
    <div className="outreach-status-row">
      <button
        type="button"
        className={`outreach-status-button outreach-status-${status}`}
        data-testid="outreach-status-button"
        onClick={onCycle}
        disabled={pending}
        aria-label={status === 'none' ? 'Track outreach' : `Outreach: ${label} — click to advance`}
      >
        {status === 'none' ? (
          <span className="outreach-status-start">Track outreach</span>
        ) : (
          <span data-testid="outreach-status-badge" className="outreach-status-badge">
            {pending ? '…' : label}
          </span>
        )}
      </button>
    </div>
  );
}

// XOL-24: Reply-time chip — shown when outreach_status=sent and outreach_sent_at present.
// Computes days elapsed independently of the existing daysAgo() helper because
// daysAgo() returns null for same-day dates (diff === 0), but we want "Sent today".
function OutreachSentChip({ sentAt }: { sentAt: string }) {
  const d = new Date(sentAt);
  if (d.getFullYear() < 2020) return null;
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const label =
    diffDays <= 0 ? 'Sent today \u00b7 no reply yet' : `Sent ${diffDays}d ago \u00b7 no reply yet`;
  return (
    <span
      className="text-xs text-muted-foreground"
      data-testid="outreach-sent-chip"
      style={{ display: 'block', marginTop: 4 }}
    >
      {label}
    </span>
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

function InterpretationBadge({
  interpretation,
}: {
  interpretation: ReplyCopilotResponse['interpretation'];
}) {
  const configs: Record<
    ReplyCopilotResponse['interpretation'],
    { label: string; className: string }
  > = {
    negotiable: { label: 'Open to negotiation', className: 'reply-badge reply-badge-negotiable' },
    firm: { label: 'Holding firm', className: 'reply-badge reply-badge-firm' },
    low_signal: { label: 'Unclear reply', className: 'reply-badge reply-badge-low-signal' },
    risky: { label: 'Risky — proceed carefully', className: 'reply-badge reply-badge-risky' },
  };
  const cfg = configs[interpretation] ?? configs['low_signal'];
  return <span className={cfg.className}>{cfg.label}</span>;
}

function daysAgo(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (d.getFullYear() < 2020) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function RecommendedActionLabel({
  action,
  offerPrice,
}: {
  action: ReplyCopilotResponse['recommended_action'];
  offerPrice?: number;
}) {
  switch (action) {
    case 'counter':
      return (
        <>
          {'→ Counter offer'}
          {offerPrice != null && offerPrice > 0 ? ` at €${(offerPrice / 100).toFixed(2)}` : ''}
        </>
      );
    case 'ask_seller':
      return <>{'→ Ask for clarification'}</>;
    case 'accept':
      return <>{'→ Accept the price'}</>;
    case 'skip':
      return <>{'→ Skip this listing'}</>;
    default:
      return <>{action}</>;
  }
}
