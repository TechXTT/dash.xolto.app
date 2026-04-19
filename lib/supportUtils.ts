// Pure support form helpers — no browser/api dependencies.
// Extracted so node --test can import them without pulling in apiFetch.
// lib/support.ts re-exports everything from here alongside submitSupportReport.

export const MIN_SUBJECT = 3;
export const MIN_MESSAGE = 20;
export const MAX_MESSAGE = 5000;

export type SupportFormValidation = { ok: true } | { ok: false; message: string };

export function validateSupportForm(
  subject: string,
  message: string,
): SupportFormValidation {
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

export function buildSupportDashContext(
  currentPath: string,
  missionId?: number,
): { current_path: string; mission_id?: number } {
  if (typeof missionId === 'number' && missionId > 0) {
    return { current_path: currentPath, mission_id: missionId };
  }
  return { current_path: currentPath };
}

export function shouldShowSupportCta(tier: string): boolean {
  void tier;
  return true;
}
