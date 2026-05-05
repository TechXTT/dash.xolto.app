'use client';

import { useEffect, useState } from 'react';

// STORAGE_KEY is preserved verbatim from the v1 (5-step modal) onboarding
// (W18-5). Existing users who already saw v1 wrote a "1" here; the migration
// in `shouldShowOnboarding` treats ANY existing value (including "1") as
// "already onboarded" so they are NOT re-onboarded with the new tooltip.
//
// XOL-166 NOTE: The directive mentioned a key like
// `xolto:onboarding:verdict-tooltip:dismissed` as an example. We deliberately
// keep the existing `xolto_onboarding_completed` key for W18-5 migration
// discipline — any value present means "already onboarded." A new key would
// cause v1+v2 users who had already dismissed to see the tooltip again.
const STORAGE_KEY = 'xolto_onboarding_completed';

// XOL-166: mode controls visual presentation.
//   'anchored'   — rendered inline inside .listing-stack before the first card,
//                  with a downward-pointing CSS arrow indicating the first verdict
//                  pill below. Used when matches are present.
//   'empty-state' — rendered as a block below the page title, with the same
//                   downward arrow. Used when missions exist but no matches yet.
//
// One-tap dismissible tooltip explaining the four-verdict surface to a new
// buyer in their first ~5 seconds. Replaces the prior 5-step modal flow (W18-5).
// No "step N of M" UI, no progress dots, no Back/Next.
export function OnboardingOverlay({
  onComplete,
  mode = 'anchored',
}: {
  onComplete: () => void;
  mode?: 'anchored' | 'empty-state';
}) {
  const [exiting, setExiting] = useState(false);

  function dismiss() {
    setExiting(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Best-effort; if storage is unavailable we still close the tooltip.
    }
    setTimeout(onComplete, 220);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`onboarding-tip onboarding-tip--${mode}${exiting ? ' exit' : ''}`}
      role="dialog"
      aria-live="polite"
      data-testid="onboarding-tip"
    >
      <div className="onboarding-tip-card">
        <div className="onboarding-tip-body">
          <p className="onboarding-tip-title">Each listing shows a verdict</p>
          <p className="onboarding-tip-copy">
            xolto tags every match Buy, Negotiate, Ask seller, or Skip — tap one to act on it. When
            in doubt, default to Ask seller.
          </p>
        </div>
        <button
          type="button"
          className="onboarding-tip-close"
          onClick={dismiss}
          aria-label="Dismiss tip"
        >
          Got it
        </button>
      </div>
      {/* Downward arrow indicating the verdict pill below (both modes) */}
      <div className="onboarding-tip-arrow" aria-hidden="true" />
    </div>
  );
}

// shouldShowOnboarding returns true only when the user has NEVER stored a
// value under STORAGE_KEY. Any pre-existing value (e.g. "1" from the v1
// 5-step modal flow) is treated as "already onboarded" — the migration is
// simply: presence-of-key wins. This keeps v1 users from being re-prompted
// with the new tooltip.
export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
