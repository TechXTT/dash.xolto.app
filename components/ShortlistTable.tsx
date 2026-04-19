'use client';

import Link from 'next/link';
import { useState } from 'react';

import { api, OutreachStatus, ReplyCopilotResponse, ShortlistEntry } from '../lib/api';
import { formatEuroFromCents } from '../lib/format';
import { ScoreBar } from './ScoreBar';

type DraftState = {
  loading: boolean;
  text: string | null;
  questions?: string[];
  offer_price?: number;
  lang?: 'bg' | 'nl' | 'en';
};

type ReplyState = {
  open: boolean;
  sellerReply: string;
  loading: boolean;
  result: ReplyCopilotResponse | null;
  error: string;
};

type Props = {
  items: ShortlistEntry[];
  onRemove?: (itemID: string) => Promise<void>;
  draftStates?: Record<string, DraftState>;
  onDraftOffer?: (itemID: string) => Promise<void>;
  comparisonMode?: boolean;
  selectedIDs?: string[];
  onToggleSelect?: (itemID: string) => void;
};

const LABEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  buy_now: { label: 'Buy now', color: 'var(--brand-700)', bg: 'var(--brand-100)' },
  worth_watching: {
    label: 'Worth watching',
    color: 'var(--warning-500)',
    bg: 'rgba(245,158,11,0.1)',
  },
  ask_questions: { label: 'Ask questions', color: 'var(--fg-700)', bg: 'rgba(15,23,42,0.07)' },
  skip: { label: 'Skip', color: 'var(--danger-600)', bg: 'rgba(220,38,38,0.08)' },
};

export function ShortlistTable({
  items,
  onRemove,
  draftStates = {},
  onDraftOffer,
  comparisonMode = false,
  selectedIDs = [],
  onToggleSelect,
}: Props) {
  const [removingID, setRemovingID] = useState<string | null>(null);
  const [replyStates, setReplyStates] = useState<Record<string, ReplyState>>({});
  // XOL-79: outreach status per item (initialised from item data when first touched)
  const [outreachStatuses, setOutreachStatuses] = useState<Record<string, OutreachStatus>>({});
  const [outreachPending, setOutreachPending] = useState<Record<string, boolean>>({});

  function getReplyState(itemID: string): ReplyState {
    return (
      replyStates[itemID] ?? {
        open: false,
        sellerReply: '',
        loading: false,
        result: null,
        error: '',
      }
    );
  }

  function setReplyField<K extends keyof ReplyState>(itemID: string, key: K, value: ReplyState[K]) {
    setReplyStates((prev) => ({
      ...prev,
      [itemID]: { ...getReplyState(itemID), ...prev[itemID], [key]: value },
    }));
  }

  async function handleInterpretReply(item: ShortlistEntry) {
    const rs = getReplyState(item.ItemID);
    if (!rs.sellerReply.trim() || rs.loading) return;
    setReplyStates((prev) => ({
      ...prev,
      [item.ItemID]: { ...getReplyState(item.ItemID), ...prev[item.ItemID], loading: true, result: null, error: '' },
    }));
    try {
      const result = await api.shortlist.replyCopilot({
        listing_id: item.ItemID,
        seller_reply: rs.sellerReply,
        mission_id: item.MissionID ? String(item.MissionID) : '',
        our_offer_price: draftStates[item.ItemID]?.offer_price ?? 0,
        verdict: item.Verdict || '',
      });
      setReplyStates((prev) => ({
        ...prev,
        [item.ItemID]: { ...getReplyState(item.ItemID), ...prev[item.ItemID], loading: false, result },
      }));
    } catch (err) {
      setReplyStates((prev) => ({
        ...prev,
        [item.ItemID]: {
          ...getReplyState(item.ItemID),
          ...prev[item.ItemID],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to interpret reply',
        },
      }));
    }
  }

  // XOL-79: cycle none→sent→replied→won→lost→none
  const OUTREACH_CYCLE: OutreachStatus[] = ['none', 'sent', 'replied', 'won', 'lost'];
  async function handleOutreachCycle(itemID: string) {
    if (outreachPending[itemID]) return;
    const current: OutreachStatus = outreachStatuses[itemID] ?? 'none';
    const nextIndex = (OUTREACH_CYCLE.indexOf(current) + 1) % OUTREACH_CYCLE.length;
    const nextStatus = OUTREACH_CYCLE[nextIndex];
    const prevStatus = current;
    setOutreachStatuses((prev) => ({ ...prev, [itemID]: nextStatus }));
    setOutreachPending((prev) => ({ ...prev, [itemID]: true }));
    try {
      await api.matches.patchOutreachStatus(itemID, nextStatus);
    } catch {
      setOutreachStatuses((prev) => ({ ...prev, [itemID]: prevStatus }));
    } finally {
      setOutreachPending((prev) => ({ ...prev, [itemID]: false }));
    }
  }

  if (items.length === 0) {
    return (
      <div className="surface-panel empty-state">
        <div className="empty-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16L12 17l-6.5 3.5V4a.5.5 0 0 1 .5-.5z" />
          </svg>
        </div>
        <h3>No saved comparisons yet</h3>
        <p>
          Save promising listings from the live feed to compare price, verdict, and fair value side
          by side.
        </p>
        <Link href="/matches" className="btn-primary">
          Browse matches
        </Link>
      </div>
    );
  }

  if (comparisonMode) {
    return (
      <div className="surface-panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="shortlist-compare-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Ask price</th>
                <th>Fair price</th>
                <th>Condition</th>
                <th>Verdict</th>
                <th>Risks</th>
                <th>Fit score</th>
                <th>Suggested offer</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const savings =
                  item.FairPrice > 0 && item.AskPrice > 0 ? item.FairPrice - item.AskPrice : 0;
                const strongBuy = isStrongBuy(item);
                return (
                  <tr key={item.ItemID} className={strongBuy ? 'strong-buy-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIDs.includes(item.ItemID)}
                        onChange={() => onToggleSelect?.(item.ItemID)}
                        disabled={!selectedIDs.includes(item.ItemID) && selectedIDs.length >= 4}
                      />
                    </td>
                    <td>
                      <a href={item.URL} target="_blank" rel="noopener noreferrer">
                        {item.Title}
                      </a>
                    </td>
                    <td>{formatEuroFromCents(item.AskPrice)}</td>
                    <td>{formatEuroFromCents(item.FairPrice)}</td>
                    <td>—</td>
                    <td>{item.Verdict || '—'}</td>
                    <td>{item.Concerns?.length ? item.Concerns.join(' | ') : '—'}</td>
                    <td>
                      {item.RecommendationScore > 0 ? item.RecommendationScore.toFixed(1) : '—'}
                    </td>
                    <td>
                      {savings > 0
                        ? formatEuroFromCents(item.AskPrice + Math.floor(savings / 2))
                        : '—'}
                    </td>
                    <td>
                      {item.SuggestedQuestions?.[0] ||
                        'Ask for recent photos and condition details.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-panel">
      {/* Desktop grid view (hidden below 768px) */}
      <div className="shortlist-grid shortlist-table-desktop">
        {items.map((item) => {
          const config = LABEL_CONFIG[item.RecommendationLabel] ?? null;
          const savings =
            item.AskPrice > 0 && item.FairPrice > 0 ? item.FairPrice - item.AskPrice : 0;
          const strongBuy = isStrongBuy(item);

          return (
            <article
              key={item.ItemID}
              className={`shortlist-card${strongBuy ? ' strong-buy' : ''}`}
            >
              <div className="shortlist-card-top">
                <div>
                  <a
                    href={item.URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shortlist-title"
                  >
                    {item.Title}
                  </a>
                  <p className="shortlist-verdict">{item.Verdict}</p>
                </div>
                {config && (
                  <span
                    className="shortlist-badge"
                    style={{ color: config.color, background: config.bg }}
                  >
                    {config.label}
                  </span>
                )}
              </div>

              {item.RecommendationScore > 0 && <ScoreBar score={item.RecommendationScore} />}

              <div className="shortlist-metrics">
                <div>
                  <span className="metric-label">Ask</span>
                  <strong>{formatEuroFromCents(item.AskPrice)}</strong>
                </div>
                <div>
                  <span className="metric-label">Fair value</span>
                  <strong>{formatEuroFromCents(item.FairPrice)}</strong>
                </div>
                <div>
                  <span className="metric-label">Opportunity</span>
                  <strong className={savings > 0 ? 'metric-positive' : ''}>
                    {savings > 0 ? formatEuroFromCents(savings) : 'Watch'}
                  </strong>
                </div>
              </div>

              {item.Concerns?.[0] && <p className="shortlist-concern">Flag: {item.Concerns[0]}</p>}
              {item.SuggestedQuestions?.length > 0 && (
                <div className="shortlist-question">
                  <strong>Suggested questions</strong>
                  <ul>
                    {item.SuggestedQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}

              {onDraftOffer && (
                <div className="offer-draft-row">
                  <button
                    type="button"
                    className="btn-primary"
                    aria-label="Draft message to seller"
                    disabled={draftStates[item.ItemID]?.loading}
                    onClick={() => void onDraftOffer(item.ItemID)}
                  >
                    {draftStates[item.ItemID]?.loading ? 'Drafting...' : 'Draft message'}
                  </button>
                  {draftStates[item.ItemID]?.text && (
                    <div className="offer-draft-block">
                      <p>{draftStates[item.ItemID]!.text}</p>
                      {(draftStates[item.ItemID]?.offer_price ?? 0) > 0 && (
                        <p className="draft-offer-price">
                          Suggested offer:{' '}
                          {draftStates[item.ItemID]!.lang === 'bg'
                            ? `€${((draftStates[item.ItemID]!.offer_price ?? 0) / 100).toFixed(2)} (${(((draftStates[item.ItemID]!.offer_price ?? 0) / 100) * 1.95583).toFixed(0)} лв.)`
                            : `€${((draftStates[item.ItemID]!.offer_price ?? 0) / 100).toFixed(2)}`}
                        </p>
                      )}
                      {(draftStates[item.ItemID]?.questions?.length ?? 0) > 0 && (
                        <div className="draft-questions" data-testid="draft-questions">
                          <p className="draft-questions-label">Questions to include:</p>
                          <ol className="draft-questions-list">
                            {draftStates[item.ItemID]!.questions!.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-copy"
                        onClick={() => {
                          const text = draftStates[item.ItemID]?.text || '';
                          if (!text) return;
                          void navigator.clipboard.writeText(text);
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* XOL-79: outreach status badge */}
              <ShortlistOutreachBadge
                status={outreachStatuses[item.ItemID] ?? 'none'}
                pending={!!outreachPending[item.ItemID]}
                onCycle={() => void handleOutreachCycle(item.ItemID)}
              />

              <ShortlistReplyPanel
                item={item}
                replyState={getReplyState(item.ItemID)}
                onToggle={() => {
                  const rs = getReplyState(item.ItemID);
                  setReplyStates((prev) => ({
                    ...prev,
                    [item.ItemID]: { ...rs, open: !rs.open, result: null, error: '' },
                  }));
                }}
                onSellerReplyChange={(val) => setReplyField(item.ItemID, 'sellerReply', val)}
                onSubmit={() => void handleInterpretReply(item)}
                onClose={() => {
                  setReplyStates((prev) => ({
                    ...prev,
                    [item.ItemID]: {
                      open: false,
                      sellerReply: '',
                      loading: false,
                      result: null,
                      error: '',
                    },
                  }));
                }}
              />

              {onRemove && (
                <div className="shortlist-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      if (removingID) return;
                      setRemovingID(item.ItemID);
                      try {
                        await onRemove(item.ItemID);
                      } finally {
                        setRemovingID(null);
                      }
                    }}
                    disabled={removingID === item.ItemID}
                  >
                    {removingID === item.ItemID ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Mobile card view (visible below 768px) */}
      <div className="shortlist-mobile-cards">
        {items.map((item) => {
          const config = LABEL_CONFIG[item.RecommendationLabel] ?? null;
          const savings =
            item.AskPrice > 0 && item.FairPrice > 0 ? item.FairPrice - item.AskPrice : 0;
          const strongBuy = isStrongBuy(item);

          return (
            <article
              key={item.ItemID}
              className={`shortlist-mobile-card${strongBuy ? ' strong-buy' : ''}`}
            >
              <div className="shortlist-mobile-card-header">
                <a
                  href={item.URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shortlist-mobile-card-title"
                >
                  {item.Title}
                </a>
                {config && (
                  <span
                    className="shortlist-badge"
                    style={{ color: config.color, background: config.bg }}
                  >
                    {config.label}
                  </span>
                )}
              </div>

              <div className="shortlist-mobile-card-metrics">
                <div className="shortlist-mobile-card-metric">
                  <span className="metric-label">Ask</span>
                  <strong>{formatEuroFromCents(item.AskPrice)}</strong>
                </div>
                <div className="shortlist-mobile-card-metric">
                  <span className="metric-label">Fair value</span>
                  <strong>{formatEuroFromCents(item.FairPrice)}</strong>
                </div>
                {item.RecommendationScore > 0 && (
                  <div className="shortlist-mobile-card-metric">
                    <span className="metric-label">Score</span>
                    <strong>{item.RecommendationScore.toFixed(1)}</strong>
                  </div>
                )}
                <div className="shortlist-mobile-card-metric">
                  <span className="metric-label">Opportunity</span>
                  <strong className={savings > 0 ? 'metric-positive' : ''}>
                    {savings > 0 ? formatEuroFromCents(savings) : 'Watch'}
                  </strong>
                </div>
              </div>

              {item.Concerns?.[0] && (
                <div className="shortlist-mobile-card-detail">
                  <strong>Risk:</strong> {item.Concerns[0]}
                </div>
              )}

              {item.SuggestedQuestions?.[0] && (
                <div className="shortlist-mobile-card-detail">
                  <strong>Next:</strong> {item.SuggestedQuestions[0]}
                </div>
              )}

              {onDraftOffer && (
                <div className="offer-draft-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    aria-label="Draft message to seller"
                    disabled={draftStates[item.ItemID]?.loading}
                    onClick={() => void onDraftOffer(item.ItemID)}
                  >
                    {draftStates[item.ItemID]?.loading ? 'Drafting...' : 'Draft message'}
                  </button>
                  {draftStates[item.ItemID]?.text && (
                    <div className="offer-draft-block">
                      <p>{draftStates[item.ItemID]!.text}</p>
                      {(draftStates[item.ItemID]?.offer_price ?? 0) > 0 && (
                        <p className="draft-offer-price">
                          Suggested offer:{' '}
                          {draftStates[item.ItemID]!.lang === 'bg'
                            ? `€${((draftStates[item.ItemID]!.offer_price ?? 0) / 100).toFixed(2)} (${(((draftStates[item.ItemID]!.offer_price ?? 0) / 100) * 1.95583).toFixed(0)} лв.)`
                            : `€${((draftStates[item.ItemID]!.offer_price ?? 0) / 100).toFixed(2)}`}
                        </p>
                      )}
                      {(draftStates[item.ItemID]?.questions?.length ?? 0) > 0 && (
                        <div className="draft-questions" data-testid="draft-questions">
                          <p className="draft-questions-label">Questions to include:</p>
                          <ol className="draft-questions-list">
                            {draftStates[item.ItemID]!.questions!.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-copy"
                        onClick={() => {
                          const text = draftStates[item.ItemID]?.text || '';
                          if (!text) return;
                          void navigator.clipboard.writeText(text);
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* XOL-79: outreach status badge */}
              <ShortlistOutreachBadge
                status={outreachStatuses[item.ItemID] ?? 'none'}
                pending={!!outreachPending[item.ItemID]}
                onCycle={() => void handleOutreachCycle(item.ItemID)}
              />

              <ShortlistReplyPanel
                item={item}
                replyState={getReplyState(item.ItemID)}
                onToggle={() => {
                  const rs = getReplyState(item.ItemID);
                  setReplyStates((prev) => ({
                    ...prev,
                    [item.ItemID]: { ...rs, open: !rs.open, result: null, error: '' },
                  }));
                }}
                onSellerReplyChange={(val) => setReplyField(item.ItemID, 'sellerReply', val)}
                onSubmit={() => void handleInterpretReply(item)}
                onClose={() => {
                  setReplyStates((prev) => ({
                    ...prev,
                    [item.ItemID]: {
                      open: false,
                      sellerReply: '',
                      loading: false,
                      result: null,
                      error: '',
                    },
                  }));
                }}
                style={{ marginTop: 10 }}
              />

              {onRemove && (
                <div className="shortlist-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      if (removingID) return;
                      setRemovingID(item.ItemID);
                      try {
                        await onRemove(item.ItemID);
                      } finally {
                        setRemovingID(null);
                      }
                    }}
                    disabled={removingID === item.ItemID}
                  >
                    {removingID === item.ItemID ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function isStrongBuy(item: ShortlistEntry) {
  if (item.RecommendationLabel === 'buy_now') return true;
  return item.Verdict.toLowerCase().includes('strong buy');
}

// ──────────────────────────────────────────
// XOL-79: Outreach status badge sub-component
// ──────────────────────────────────────────

const OUTREACH_LABELS: Record<OutreachStatus, string> = {
  none: '',
  sent: 'Sent',
  replied: 'Replied',
  won: 'Won \u2713',
  lost: 'Lost',
};

function ShortlistOutreachBadge({
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

// ──────────────────────────────────────────
// Reply Copilot shared sub-components
// ──────────────────────────────────────────

function ShortlistReplyPanel({
  item,
  replyState,
  onToggle,
  onSellerReplyChange,
  onSubmit,
  onClose,
  style,
}: {
  item: ShortlistEntry;
  replyState: ReplyState;
  onToggle: () => void;
  onSellerReplyChange: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <button
        type="button"
        className="btn-ghost reply-copilot-btn"
        onClick={onToggle}
      >
        Seller replied?
      </button>
      {replyState.open && (
        <div className="reply-copilot-panel">
          <div className="reply-copilot-panel-header">
            <span className="reply-copilot-panel-title">Interpret seller reply</span>
            <button
              type="button"
              className="reply-copilot-close"
              aria-label="Close reply panel"
              onClick={onClose}
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
            value={replyState.sellerReply}
            onChange={(e) => onSellerReplyChange(e.target.value)}
            disabled={replyState.loading}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={onSubmit}
            disabled={replyState.loading || !replyState.sellerReply.trim()}
          >
            {replyState.loading ? (
              <>
                <span className="reply-copilot-spinner" aria-hidden="true" />
                Interpreting…
              </>
            ) : (
              'Interpret reply'
            )}
          </button>
          {replyState.error && <p className="reply-copilot-error">{replyState.error}</p>}
          {replyState.result && (
            <div className="reply-copilot-result">
              <div className="reply-copilot-interpretation">
                <ShortlistInterpretationBadge interpretation={replyState.result.interpretation} />
              </div>
              <p className="reply-copilot-action">
                <ShortlistRecommendedActionLabel
                  action={replyState.result.recommended_action}
                  offerPrice={replyState.result.offer_price}
                />
              </p>
              {replyState.result.confidence === 'low' && (
                <div className="reply-copilot-amber-banner">
                  Reply is ambiguous — review carefully before responding.
                </div>
              )}
              <div className="reply-copilot-draft-block">
                <pre
                  className="reply-copilot-draft-text"
                  data-testid="reply-draft-message"
                >
                  {replyState.result.draft_next_message}
                </pre>
                <button
                  type="button"
                  className="btn-copy"
                  onClick={() => {
                    void navigator.clipboard.writeText(replyState.result!.draft_next_message);
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
  );
}

function ShortlistInterpretationBadge({
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

function ShortlistRecommendedActionLabel({
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
