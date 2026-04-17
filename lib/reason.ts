// XOL-19 v0.8 — "Structured reason-for-verdict."
//
// Pure presenter: parses the scorer's `Reason` string into a set of
// presentational chips (fair-value %, confidence, condition) plus the
// prose tail that follows the `" | "` separator. Mirrors the structural
// allowlist exposed by the backend scorer (Q-G audit, 2026-04-17):
//
//   "55% of fair value (EUR 120.00) | <prose>"
//   "55% of fair value (EUR 120.00), confidence 0.82 | <prose>"
//   "55% of fair value (EUR 120.00), confidence 0.82, excellent condition | <prose>"
//
// Split out from ListingCard.tsx so the helper is importable by the node
// --test suite without dragging JSX/React into the test runtime. Pure —
// no DOM, no React, no side effects.
//
// Allowlist (every comma-part kind enumerated, per subagent_brief_allowlists):
//
//   matches /^\d+% of fair value/i      → kind: "value"
//   matches /^confidence\s/i            → kind: "confidence"
//   any other non-empty part            → kind: "condition"
//   empty comma-part                    → skipped
//
// Malformed fallthroughs:
//   no "|" in input                     → chips=[], prose=raw
//   empty prefix before "|"             → chips=[], prose=<tail after |>
//   empty string input                  → chips=[], prose=""

export interface ReasonChip {
  kind: 'value' | 'confidence' | 'condition';
  label: string;
}

export interface ParsedReason {
  chips: ReasonChip[];
  /** Prose tail after the first `"|"`. Empty string when no `"|"` in input. */
  prose: string;
  /** Original full string, for fallback rendering. */
  raw: string;
}

const VALUE_RE = /^\d+% of fair value/i;
const CONFIDENCE_RE = /^confidence\s/i;

export function parseReason(reason: string): ParsedReason {
  const raw = typeof reason === 'string' ? reason : '';

  // No "|" at all → malformed. Keep full raw as prose for fallback rendering,
  // but emit "" when raw itself is empty so callers don't render a stray
  // empty <p>.
  const pipeIdx = raw.indexOf('|');
  if (pipeIdx === -1) {
    return { chips: [], prose: raw, raw };
  }

  const prefix = raw.slice(0, pipeIdx).trim();
  const prose = raw.slice(pipeIdx + 1).trim();

  // Empty prefix before "|" → malformed prefix, preserve prose only.
  if (prefix.length === 0) {
    return { chips: [], prose, raw };
  }

  const chips: ReasonChip[] = [];
  for (const rawPart of prefix.split(', ')) {
    const part = rawPart.trim();
    if (part.length === 0) continue;

    if (VALUE_RE.test(part)) {
      chips.push({ kind: 'value', label: part });
    } else if (CONFIDENCE_RE.test(part)) {
      chips.push({ kind: 'confidence', label: part });
    } else {
      chips.push({ kind: 'condition', label: part });
    }
  }

  return { chips, prose, raw };
}
