// Support report fetch wrapper + pure form helpers (XOL-57 / SUP-6).
//
// This module is the single dash entrypoint for POST /v1/support/report.
// It mirrors the conventions in lib/api.ts:
//   - relies on `apiFetch` for session-cookie auth (credentials: "include"),
//     401 → refresh → retry, JSON parsing, and error normalization
//   - exposes a pure, typed function so callers (sheet component, unit tests)
//     don't hand-roll fetch
//
// The form-validation + dash_context helpers live here (not in the
// component) so the node --test harness can import them from pure TS
// without pulling a JSX file into its graph.

import { apiFetch } from './api';
import type { SupportReportRequest, SupportReportResponse } from './api';

// submitSupportReport POSTs the report and returns the backend envelope.
// On non-2xx, `apiFetch` throws an Error with the normalized message — the
// caller catches and switches to the error state; this wrapper never swallows.
export async function submitSupportReport(
  body: SupportReportRequest,
): Promise<SupportReportResponse> {
  return apiFetch<SupportReportResponse>('/v1/support/report', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Form validation constants. Kept small and stable; trust backend to
// enforce the same bounds (defense-in-depth, not authority).
export const MIN_SUBJECT = 3;
export const MIN_MESSAGE = 20;
export const MAX_MESSAGE = 5000;

export type SupportFormValidation = { ok: true } | { ok: false; message: string };

// validateSupportForm is the pure validator used both inline (to compute
// `canSubmit`) and from the unit test. It trims whitespace before counting
// so leading/trailing padding doesn't satisfy the minimums.
export function validateSupportForm(subject: string, message: string): SupportFormValidation {
  const s = subject.trim();
  const m = message.trim();
  if (s.length < MIN_SUBJECT) {
    return { ok: false, message: `Subject must be at least ${MIN_SUBJECT} characters.` };
  }
  if (m.length < MIN_MESSAGE) {
    return { ok: false, message: `Message must be at least ${MIN_MESSAGE} characters.` };
  }
  if (m.length > MAX_MESSAGE) {
    return { ok: false, message: `Message must be at most ${MAX_MESSAGE} characters.` };
  }
  return { ok: true };
}

// buildSupportDashContext assembles the `dash_context` payload attached to
// every support report. `mission_id` is omitted when absent or non-positive
// so the backend never sees a zero.
export function buildSupportDashContext(
  currentPath: string,
  missionId?: number,
): { current_path: string; mission_id?: number } {
  if (typeof missionId === 'number' && missionId > 0) {
    return { current_path: currentPath, mission_id: missionId };
  }
  return { current_path: currentPath };
}

// shouldShowSupportCta is the plan-gate predicate. The sheet is visible to
// every tier — no gate, no upsell (AC-5). Exported so the unit test can pin
// the behavior and any future tier-gating regression gets caught at CI time.
export function shouldShowSupportCta(tier: string): boolean {
  // Intentional: the function ignores tier entirely.
  void tier;
  return true;
}
