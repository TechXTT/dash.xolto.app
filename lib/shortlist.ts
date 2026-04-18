import type { ShortlistEntry } from './api';

// Accepts null/undefined because the markt backend serialises an empty
// Go slice as JSON `null` rather than `[]` — without the coalesce, Safari
// throws "null is not an object (evaluating 'e.filter')" on fresh accounts.
export function normalizeShortlist(items: ShortlistEntry[] | null | undefined): ShortlistEntry[] {
  return (items ?? []).filter((item) => item.Status !== 'removed');
}
