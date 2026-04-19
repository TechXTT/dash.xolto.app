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

export {
  MIN_SUBJECT,
  MIN_MESSAGE,
  MAX_MESSAGE,
  validateSupportForm,
  buildSupportDashContext,
  shouldShowSupportCta,
} from './supportUtils';
export type { SupportFormValidation } from './supportUtils';

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
