'use client';

// ContactSupportSheet — "Contact support" slide-over used from /settings
// (XOL-57 / SUP-6).
//
// Responsibilities (pure presentation; backend owns meaning):
//   - Sheet chrome (full-height on ≤768px, right-anchored 480px on >768px)
//   - Form with subject (>=3 chars) + message (>=20, <=5000 chars)
//   - Auto-attaches dash_context: current_path (+ mission_id if in URL)
//   - On submit: calls lib/support.submitSupportReport
//   - Confirmation state: "Thanks! We'll reply by email within 1 business day."
//   - Error state: "Something went wrong — please email support@xolto.app
//     directly." with a retry button (no stack traces surfaced)
//
// Mobile hard AC (390×844):
//   - 16px font on text inputs (prevents iOS Safari auto-zoom on focus)
//   - env(safe-area-inset-bottom) padding on the submit row so the Submit
//     button stays visible above the iOS keyboard
//   - No horizontal overflow
//
// Visibility:
//   - No plan gate. All tiers (including `free`) see the button unmodified.

import { useEffect, useId, useMemo, useState } from 'react';

import {
  MAX_MESSAGE,
  MIN_MESSAGE,
  MIN_SUBJECT,
  buildSupportDashContext,
  submitSupportReport,
  validateSupportForm,
} from '../../lib/support';

export type ContactSupportSheetProps = {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  currentPath: string;
  // If the caller is on a mission-scoped page, forward the mission_id so
  // the backend can correlate the ticket. Optional.
  missionId?: number;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSupportSheet({
  open,
  onClose,
  userEmail,
  currentPath,
  missionId,
}: ContactSupportSheetProps) {
  const subjectId = useId();
  const messageId = useId();
  const emailId = useId();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [validationError, setValidationError] = useState<string>('');

  // Reset form state each time the sheet transitions from closed → open so a
  // previously-submitted ticket doesn't leak into a fresh compose.
  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setStatus('idle');
      setValidationError('');
    }
  }, [open]);

  // Trap Escape to close the sheet while open (accessibility / mobile UX).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const subjectTrim = subject.trim();
  const messageTrim = message.trim();
  const canSubmit = useMemo(
    () =>
      subjectTrim.length >= MIN_SUBJECT &&
      messageTrim.length >= MIN_MESSAGE &&
      messageTrim.length <= MAX_MESSAGE &&
      status !== 'submitting',
    [subjectTrim, messageTrim, status],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const check = validateSupportForm(subject, message);
    if (!check.ok) {
      setValidationError(check.message);
      return;
    }
    setValidationError('');
    setStatus('submitting');
    try {
      await submitSupportReport({
        subject: subjectTrim,
        message: messageTrim,
        dash_context: buildSupportDashContext(currentPath, missionId),
      });
      setStatus('success');
    } catch {
      // Intentional: never surface the raw error to the user — we route them
      // to a known-good mailto fallback. Engineering telemetry lives in
      // Sentry via apiFetch's throw site, not the UI.
      setStatus('error');
    }
  }

  if (!open) return null;

  return (
    <div
      className="contact-support-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-support-title"
      data-testid="contact-support-sheet"
    >
      <button
        type="button"
        aria-label="Close support sheet"
        className="contact-support-scrim"
        onClick={onClose}
      />
      <aside className="contact-support-sheet">
        <header className="contact-support-header">
          <div>
            <p className="contact-support-kicker">Support</p>
            <h2 id="contact-support-title" className="contact-support-title">
              Contact support
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="contact-support-close"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {status === 'success' ? (
          <div className="contact-support-body" data-testid="contact-support-success">
            <div className="contact-support-success-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="contact-support-success-title">Thanks!</h3>
            <p className="contact-support-copy">
              We&rsquo;ll reply by email within 1 business day.
            </p>
            <div className="contact-support-footer">
              <button
                type="button"
                className="btn-primary contact-support-submit"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="contact-support-body" data-testid="contact-support-error">
            <p className="contact-support-copy">
              Something went wrong &mdash; please email{' '}
              <a href="mailto:support@xolto.app">support@xolto.app</a> directly.
            </p>
            <div className="contact-support-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStatus('idle')}
                data-testid="contact-support-retry"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <form className="contact-support-body" onSubmit={handleSubmit}>
            <div className="contact-support-field">
              <label className="label" htmlFor={emailId}>
                Your email
              </label>
              <input
                id={emailId}
                className="input contact-support-input"
                type="email"
                value={userEmail}
                readOnly
                aria-readonly="true"
              />
            </div>

            <div className="contact-support-field">
              <label className="label" htmlFor={subjectId}>
                Subject
              </label>
              <input
                id={subjectId}
                className="input contact-support-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                minLength={MIN_SUBJECT}
                required
                data-testid="contact-support-subject"
              />
            </div>

            <div className="contact-support-field">
              <label className="label" htmlFor={messageId}>
                Message
              </label>
              <textarea
                id={messageId}
                className="input contact-support-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? What were you trying to do?"
                minLength={MIN_MESSAGE}
                maxLength={MAX_MESSAGE}
                rows={6}
                required
                data-testid="contact-support-message"
              />
              <p className="contact-support-help">
                {messageTrim.length}/{MAX_MESSAGE} characters &middot; minimum {MIN_MESSAGE}
              </p>
            </div>

            <p className="contact-support-context">
              We&rsquo;ll attach the page you&rsquo;re on
              {typeof missionId === 'number' && missionId > 0 ? ' and the current mission' : ''} so
              we can help faster.
            </p>

            {validationError && (
              <div className="error-msg" role="alert">
                {validationError}
              </div>
            )}

            <div className="contact-support-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={status === 'submitting'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary contact-support-submit"
                disabled={!canSubmit}
                data-testid="contact-support-submit"
              >
                {status === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </aside>

      {/*
        Scoped styles: we keep them co-located with the component (rather
        than extending app/globals.css) so the file allowlist for this PR
        stays small and globals.css stays stable. Selectors are prefixed
        with `contact-support-` to avoid collisions.
      */}
      <style jsx>{`
        .contact-support-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
        }
        .contact-support-scrim {
          position: absolute;
          inset: 0;
          background: rgba(8, 21, 16, 0.45);
          backdrop-filter: blur(2px);
          border: 0;
          padding: 0;
          cursor: default;
        }
        .contact-support-sheet {
          position: relative;
          background: var(--surface-strong, #ffffff);
          color: var(--fg-900, #081510);
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          box-shadow: var(--shadow-xl, 0 20px 60px rgba(0, 0, 0, 0.35));
          overflow: hidden;
          animation: contact-support-slide-up 220ms ease-out;
        }
        .contact-support-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 20px 12px;
          border-bottom: 1px solid var(--border-strong, rgba(8, 21, 16, 0.08));
          flex-shrink: 0;
        }
        .contact-support-kicker {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--fg-700, #4a5a52);
          margin: 0 0 4px;
          font-weight: 700;
        }
        .contact-support-title {
          font-size: 1.25rem;
          margin: 0;
          font-weight: 700;
        }
        .contact-support-close {
          background: transparent;
          border: 1px solid var(--border-strong, rgba(8, 21, 16, 0.12));
          border-radius: 999px;
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-700, #4a5a52);
          cursor: pointer;
          flex-shrink: 0;
        }
        .contact-support-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 20px 20px;
          overflow-y: auto;
          flex: 1;
          /* Keep the submit row visible above the iOS keyboard */
          padding-bottom: calc(20px + env(safe-area-inset-bottom));
          overscroll-behavior: contain;
        }
        .contact-support-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        /* 16px text inputs prevent iOS Safari auto-zoom on focus */
        .contact-support-input,
        .contact-support-textarea {
          font-size: 16px;
        }
        .contact-support-textarea {
          min-height: 140px;
          padding: 12px 14px;
          line-height: 1.45;
          resize: vertical;
          font-family: inherit;
        }
        .contact-support-help {
          font-size: 0.78rem;
          color: var(--fg-700, #4a5a52);
          margin: 0;
        }
        .contact-support-context {
          font-size: 0.82rem;
          color: var(--fg-700, #4a5a52);
          margin: 0;
        }
        .contact-support-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: auto;
          padding-top: 8px;
          position: sticky;
          bottom: 0;
          background: var(--surface-strong, #ffffff);
        }
        .contact-support-submit {
          min-width: 120px;
        }
        .contact-support-copy {
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--fg-900, #081510);
          margin: 0;
        }
        .contact-support-success-icon {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--brand-50, rgba(15, 143, 103, 0.12));
          color: var(--brand-600, #0f8f67);
          margin-bottom: 4px;
        }
        .contact-support-success-title {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 700;
        }
        @keyframes contact-support-slide-up {
          from {
            transform: translateY(12px);
            opacity: 0.85;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        /* Desktop: right-anchored partial sheet */
        @media (min-width: 769px) {
          .contact-support-sheet {
            width: 480px;
            max-width: 100vw;
            height: 100vh;
            height: 100dvh;
            animation: contact-support-slide-left 220ms ease-out;
          }
          @keyframes contact-support-slide-left {
            from {
              transform: translateX(16px);
              opacity: 0.85;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        }
      `}</style>
    </div>
  );
}
