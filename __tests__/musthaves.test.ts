// Unit tests for the XOL-18 v0.8 must-have chip presenter.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test __tests__/musthaves.test.ts
//
// Covers the three EXHAUSTIVE status literals plus defensive fallthrough
// for malformed envelope data (undefined / null / unknown string).

import test from 'node:test';
import assert from 'node:assert/strict';

import { mustHaveChipStyle } from '../lib/musthaves.ts';

test('status="met" → green-ish chip, leading ✓ glyph', () => {
  const s = mustHaveChipStyle('met');
  assert.equal(s.status, 'met');
  assert.equal(s.glyph, '\u2713'); // ✓
});

test('status="missed" → red-ish chip, leading ✗ glyph', () => {
  const s = mustHaveChipStyle('missed');
  assert.equal(s.status, 'missed');
  assert.equal(s.glyph, '\u2717'); // ✗
});

test('status="unknown" → gray chip, leading ? glyph', () => {
  const s = mustHaveChipStyle('unknown');
  assert.equal(s.status, 'unknown');
  assert.equal(s.glyph, '?');
});

test('undefined status → falls through to unknown', () => {
  const s = mustHaveChipStyle(undefined);
  assert.equal(s.status, 'unknown');
  assert.equal(s.glyph, '?');
});

test('null status → falls through to unknown', () => {
  const s = mustHaveChipStyle(null);
  assert.equal(s.status, 'unknown');
  assert.equal(s.glyph, '?');
});

test('empty string status → falls through to unknown', () => {
  const s = mustHaveChipStyle('');
  assert.equal(s.status, 'unknown');
  assert.equal(s.glyph, '?');
});

test('unrecognised status literal → falls through to unknown', () => {
  // Defensive: backend contract is EXHAUSTIVE but any envelope-level drift
  // must render as the neutral (unknown) visual, not crash the card.
  const s = mustHaveChipStyle('partial');
  assert.equal(s.status, 'unknown');
  assert.equal(s.glyph, '?');
});

test('case-sensitive match — "Met" (capitalised) falls through to unknown', () => {
  // Backend always emits lowercase. Anything else is malformed → unknown.
  const s = mustHaveChipStyle('Met');
  assert.equal(s.status, 'unknown');
});
