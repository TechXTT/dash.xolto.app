'use client';

// XOL-107: Pre-send review modal — clipboard prefill + OLX deep-link
// The modal does NOT send anything directly. On "Open in OLX" it:
//   1. Copies the (possibly edited) textarea content to clipboard
//   2. Opens the OLX listing in a new tab
//   3. Calls onConfirm so the parent can advance OutreachStatus to "sent"

import { useState } from 'react';

interface SendReviewModalProps {
  draftText: string;
  itemURL: string;
  itemTitle: string;
  offerPrice?: number; // EUR cents, optional
  offerLang?: 'bg' | 'nl' | 'en';
  questions?: string[];
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

export function SendReviewModal({
  draftText,
  itemURL,
  itemTitle,
  offerPrice,
  offerLang,
  questions,
  onConfirm,
  onCancel,
}: SendReviewModalProps) {
  const [text, setText] = useState(draftText);
  const [clipboardWarning, setClipboardWarning] = useState(false);

  async function handleOpenInOLX() {
    setClipboardWarning(false);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setClipboardWarning(true);
    }
    window.open(itemURL, '_blank', 'noopener,noreferrer');
    onConfirm(text);
  }

  const offerLabel =
    offerPrice && offerPrice > 0
      ? offerLang === 'bg'
        ? `BGN ${((offerPrice / 100) * 1.95583).toFixed(0)}`
        : `€${(offerPrice / 100).toFixed(2)}`
      : null;

  return (
    <div className="send-review-backdrop" role="dialog" aria-modal="true" aria-labelledby="srm-title">
      <div className="send-review-card">
        <h2 id="srm-title" className="send-review-title">
          Review your message
        </h2>
        <p className="send-review-item-title">{itemTitle}</p>

        <textarea
          className="send-review-textarea"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="send-review-textarea"
        />

        {offerLabel && (
          <div className="send-review-offer-pill" data-testid="send-review-offer-pill">
            Suggested offer: {offerLabel}
          </div>
        )}

        {questions && questions.length > 0 && (
          <div className="send-review-questions">
            <p className="send-review-questions-label">Suggested questions:</p>
            <ol className="send-review-questions-list">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
        )}

        {clipboardWarning && (
          <p className="send-review-clipboard-warning" role="alert" data-testid="clipboard-warning">
            Couldn&apos;t copy automatically — paste manually
          </p>
        )}

        <div className="send-review-actions">
          <button
            type="button"
            className="btn-primary send-review-confirm"
            data-testid="send-review-confirm"
            onClick={() => void handleOpenInOLX()}
          >
            Open in OLX
          </button>
          <button
            type="button"
            className="btn-ghost send-review-cancel"
            data-testid="send-review-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
