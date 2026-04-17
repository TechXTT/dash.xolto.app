// Unit tests for the XOL-19 v0.8 structured-reason presenter.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test __tests__/reason.test.ts
//
// Covers:
//   - All 3 known prefix variants (value-only; +confidence; +condition).
//   - Malformed: no "|" → chips=[], prose=raw.
//   - Malformed: empty prefix before "|" → chips=[], prose=<tail>.
//   - Empty input → chips=[], prose="", raw="".
//   - Representative structural samples (6+ variants).

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseReason } from '../lib/reason.ts';

test('variant 1 — value-only prefix', () => {
  const r = parseReason('55% of fair value (EUR 120.00) | solid buy at listed price.');
  assert.equal(r.chips.length, 1);
  assert.deepEqual(r.chips[0], {
    kind: 'value',
    label: '55% of fair value (EUR 120.00)',
  });
  assert.equal(r.prose, 'solid buy at listed price.');
  assert.equal(r.raw, '55% of fair value (EUR 120.00) | solid buy at listed price.');
});

test('variant 2 — value + confidence', () => {
  const r = parseReason(
    '55% of fair value (EUR 120.00), confidence 0.82 | price anchors well below comparable median.',
  );
  assert.equal(r.chips.length, 2);
  assert.deepEqual(r.chips[0], {
    kind: 'value',
    label: '55% of fair value (EUR 120.00)',
  });
  assert.deepEqual(r.chips[1], { kind: 'confidence', label: 'confidence 0.82' });
  assert.equal(r.prose, 'price anchors well below comparable median.');
});

test('variant 3 — value + confidence + condition', () => {
  const r = parseReason(
    '55% of fair value (EUR 120.00), confidence 0.82, excellent condition | clean listing, full accessories shown.',
  );
  assert.equal(r.chips.length, 3);
  assert.deepEqual(r.chips[0], {
    kind: 'value',
    label: '55% of fair value (EUR 120.00)',
  });
  assert.deepEqual(r.chips[1], { kind: 'confidence', label: 'confidence 0.82' });
  assert.deepEqual(r.chips[2], { kind: 'condition', label: 'excellent condition' });
  assert.equal(r.prose, 'clean listing, full accessories shown.');
});

test('malformed — no "|" in input → chips=[], prose=raw', () => {
  const input = '55% of fair value (EUR 120.00) solid buy with no separator';
  const r = parseReason(input);
  assert.deepEqual(r.chips, []);
  assert.equal(r.prose, input);
  assert.equal(r.raw, input);
});

test('malformed — empty prefix before "|" → chips=[], prose=<tail>', () => {
  const r = parseReason(' | tail-only prose after empty prefix.');
  assert.deepEqual(r.chips, []);
  assert.equal(r.prose, 'tail-only prose after empty prefix.');
  assert.equal(r.raw, ' | tail-only prose after empty prefix.');
});

test('empty string input → chips=[], prose="", raw=""', () => {
  const r = parseReason('');
  assert.deepEqual(r.chips, []);
  assert.equal(r.prose, '');
  assert.equal(r.raw, '');
});

test('variant samples — 80% buy-zone value-only', () => {
  const r = parseReason('80% of fair value (EUR 400.00) | priced near top of buy zone.');
  assert.equal(r.chips.length, 1);
  assert.equal(r.chips[0].kind, 'value');
  assert.equal(r.chips[0].label, '80% of fair value (EUR 400.00)');
});

test('variant samples — mint condition third chip', () => {
  const r = parseReason(
    '62% of fair value (EUR 310.00), confidence 0.91, mint condition | sealed, original packaging.',
  );
  assert.equal(r.chips.length, 3);
  assert.equal(r.chips[2].kind, 'condition');
  assert.equal(r.chips[2].label, 'mint condition');
});

test('variant samples — fair condition third chip', () => {
  const r = parseReason(
    '45% of fair value (EUR 90.00), confidence 0.55, fair condition | scuffs on chassis; confirm screen OK.',
  );
  assert.equal(r.chips.length, 3);
  assert.equal(r.chips[2].kind, 'condition');
  assert.equal(r.chips[2].label, 'fair condition');
});

test('variant samples — percentage case-insensitivity', () => {
  // Scorer always outputs lowercase, but presenter should not care.
  const r = parseReason('75% OF FAIR VALUE (EUR 200.00) | tail.');
  assert.equal(r.chips.length, 1);
  assert.equal(r.chips[0].kind, 'value');
});

test('variant samples — confidence token case-insensitivity', () => {
  const r = parseReason('50% of fair value (EUR 80.00), Confidence 0.70 | tail.');
  assert.equal(r.chips.length, 2);
  assert.equal(r.chips[1].kind, 'confidence');
  assert.equal(r.chips[1].label, 'Confidence 0.70');
});

test('variant samples — unknown condition-ish text falls through to condition kind', () => {
  const r = parseReason(
    '55% of fair value (EUR 120.00), confidence 0.82, with original box | tail.',
  );
  assert.equal(r.chips.length, 3);
  assert.equal(r.chips[2].kind, 'condition');
  assert.equal(r.chips[2].label, 'with original box');
});

test('only first "|" is treated as the prefix/prose separator', () => {
  // Additional "|" chars inside the prose tail must survive unmodified.
  const r = parseReason('55% of fair value (EUR 120.00) | prose with | pipe inside.');
  assert.equal(r.chips.length, 1);
  assert.equal(r.prose, 'prose with | pipe inside.');
});

test('empty prose tail is preserved as "" (not undefined)', () => {
  const r = parseReason('55% of fair value (EUR 120.00) |');
  assert.equal(r.chips.length, 1);
  assert.equal(r.prose, '');
  assert.equal(typeof r.prose, 'string');
});

test('whitespace-only comma-parts are skipped', () => {
  const r = parseReason('55% of fair value (EUR 120.00),  , confidence 0.82 | tail.');
  assert.equal(r.chips.length, 2);
  assert.equal(r.chips[0].kind, 'value');
  assert.equal(r.chips[1].kind, 'confidence');
});
