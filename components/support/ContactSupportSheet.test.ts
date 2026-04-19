// Unit tests for the XOL-57 / SUP-6 Contact-support pure helpers.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test components/support/ContactSupportSheet.test.ts
//
// This file lives next to the sheet component (per the XOL-57 file
// allowlist). It imports the pure helpers from `lib/support` — the
// DOM-bearing .tsx is exercised via the mobile Playwright gate at 390×844
// (AC-2, AC-3, AC-4).
//
// Covers:
//   - validateSupportForm: subject <3, message <20, message >5000, happy
//   - buildSupportDashContext: omits/attaches mission_id correctly
//   - shouldShowSupportCta: AC-5 — visible for every tier including `free`

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MIN_SUBJECT,
  MIN_MESSAGE,
  MAX_MESSAGE,
  buildSupportDashContext,
  shouldShowSupportCta,
  validateSupportForm,
} from '../../lib/supportUtils.ts';

test('validateSupportForm rejects subject shorter than MIN_SUBJECT', () => {
  const short = 'a'.repeat(MIN_SUBJECT - 1);
  const res = validateSupportForm(short, 'm'.repeat(MIN_MESSAGE));
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.message, /Subject must be at least/);
  }
});

test('validateSupportForm rejects message shorter than MIN_MESSAGE', () => {
  const res = validateSupportForm('a'.repeat(MIN_SUBJECT), 'm'.repeat(MIN_MESSAGE - 1));
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.message, /Message must be at least/);
  }
});

test('validateSupportForm rejects message longer than MAX_MESSAGE', () => {
  const res = validateSupportForm('a'.repeat(MIN_SUBJECT), 'm'.repeat(MAX_MESSAGE + 1));
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.message, /Message must be at most/);
  }
});

test('validateSupportForm accepts minimally valid subject + message', () => {
  const res = validateSupportForm('a'.repeat(MIN_SUBJECT), 'm'.repeat(MIN_MESSAGE));
  assert.equal(res.ok, true);
});

test('validateSupportForm trims whitespace before counting', () => {
  const padded = '   ' + 'a'.repeat(MIN_SUBJECT) + '   ';
  const res = validateSupportForm(padded, '   ' + 'm'.repeat(MIN_MESSAGE) + '   ');
  assert.equal(res.ok, true);
});

test('buildSupportDashContext omits mission_id when missing', () => {
  const ctx = buildSupportDashContext('/settings');
  assert.equal(ctx.current_path, '/settings');
  assert.equal('mission_id' in ctx, false);
});

test('buildSupportDashContext omits mission_id when zero or negative', () => {
  const zero = buildSupportDashContext('/settings', 0);
  assert.equal('mission_id' in zero, false);
  const neg = buildSupportDashContext('/settings', -1);
  assert.equal('mission_id' in neg, false);
});

test('buildSupportDashContext attaches positive mission_id', () => {
  const ctx = buildSupportDashContext('/missions', 42);
  assert.equal(ctx.current_path, '/missions');
  assert.equal(ctx.mission_id, 42);
});

// AC-5: free-tier visibility. The sheet / button is never behind a plan
// gate. If a future change introduces a tier check, this test fails.
test('AC-5 free-tier visibility: Contact support is visible to every tier', () => {
  for (const tier of ['free', 'pro', 'power', 'unknown_future_tier']) {
    assert.equal(
      shouldShowSupportCta(tier),
      true,
      `expected tier="${tier}" to see the Contact support CTA`,
    );
  }
});
