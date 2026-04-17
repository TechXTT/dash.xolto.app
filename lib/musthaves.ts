// XOL-18 v0.8 — "Must-have match indicator."
//
// Pure presenter: maps a per-must-have status emitted by the backend scorer
// to the glyph + data-attribute that the chip DOM should render. Split out
// from ListingCard.tsx so the helper is importable by the node --test suite
// without dragging JSX/React into the test runtime.
//
// Status allowlist (every value enumerated, per subagent_brief_allowlists):
//
//   "met"     → green chip, leading "✓" glyph
//   "missed"  → red chip,   leading "✗" glyph
//   "unknown" → gray chip,  leading "?" glyph
//
// Fallthrough: anything outside the three known literals (should never happen
// given the EXHAUSTIVE backend contract, but defensively treat malformed
// envelope data as "unknown" so the UI never crashes on unexpected input).
//
// The returned `status` is the literal attribute written to the chip's
// `data-musthave-status` attribute; CSS selector in globals.css keys off
// that attribute for per-status colour.

import type { MustHaveStatus } from './api';

export interface MustHaveChipStyle {
  /** Canonical status literal, safe to write to `data-musthave-status`. */
  status: MustHaveStatus;
  /** Leading glyph: ✓ / ✗ / ? */
  glyph: string;
}

export function mustHaveChipStyle(status: string | undefined | null): MustHaveChipStyle {
  switch (status) {
    case 'met':
      return { status: 'met', glyph: '\u2713' }; // ✓
    case 'missed':
      return { status: 'missed', glyph: '\u2717' }; // ✗
    case 'unknown':
    default:
      return { status: 'unknown', glyph: '?' };
  }
}
