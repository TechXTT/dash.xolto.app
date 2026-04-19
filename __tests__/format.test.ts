// Unit tests for the BGN formatter primitives.
// Runs under Node's built-in test runner (node --test) with native TS
// support — no framework, no transpile step.
//
//   node --test __tests__/format.test.ts
//
// Bulgaria adopted EUR on 2026-01-01. formatBGNFromEuroCents now returns
// EUR-primary with BGN in parentheses: "€X.XX (NNN лв.)".

import test from 'node:test';
import assert from 'node:assert/strict';

import { EUR_TO_BGN_PEG, formatBGNFromEuroCents, isBulgarianMarketplace } from '../lib/bgn.ts';

test('EUR_TO_BGN_PEG is the fixed currency-board peg', () => {
  assert.equal(EUR_TO_BGN_PEG, 1.95583);
});

test('formatBGNFromEuroCents(10000) → €100.00 (196 лв.)', () => {
  // 10000 cents = €100 × 1.95583 = 195.583 BGN → 196 when rounded.
  assert.equal(formatBGNFromEuroCents(10000), '€100.00 (196 лв.)');
});

test('formatBGNFromEuroCents(5000) → €50.00 (98 лв.)', () => {
  // 5000 cents = €50 × 1.95583 = 97.7915 BGN → 98 when rounded.
  assert.equal(formatBGNFromEuroCents(5000), '€50.00 (98 лв.)');
});

test('formatBGNFromEuroCents(0) → fallback', () => {
  assert.equal(formatBGNFromEuroCents(0), '—');
  assert.equal(formatBGNFromEuroCents(0, 'n/a'), 'n/a');
});

test('formatBGNFromEuroCents(-50) → fallback (defensive)', () => {
  assert.equal(formatBGNFromEuroCents(-50), '—');
});

test('formatBGNFromEuroCents(NaN) → fallback (defensive)', () => {
  assert.equal(formatBGNFromEuroCents(Number.NaN), '—');
});

test('isBulgarianMarketplace matches canonical olxbg', () => {
  assert.equal(isBulgarianMarketplace('olxbg'), true);
});

test('isBulgarianMarketplace tolerates olx-bg / olx.bg variants (defensive)', () => {
  assert.equal(isBulgarianMarketplace('olx-bg'), true);
  assert.equal(isBulgarianMarketplace('olx.bg'), true);
  assert.equal(isBulgarianMarketplace('OLX-BG'), true);
});

test('isBulgarianMarketplace returns false for non-BG marketplaces', () => {
  assert.equal(isBulgarianMarketplace('marktplaats'), false);
  assert.equal(isBulgarianMarketplace('vinted_nl'), false);
  assert.equal(isBulgarianMarketplace('vinted_dk'), false);
});

test('isBulgarianMarketplace returns false for missing / empty id', () => {
  assert.equal(isBulgarianMarketplace(undefined), false);
  assert.equal(isBulgarianMarketplace(null), false);
  assert.equal(isBulgarianMarketplace(''), false);
});
