// Unit tests for the BGN formatter primitives added in XOL-61 (TRUST-1).
// Runs under Node's built-in test runner (node --test) with native TS
// support — no framework, no transpile step.
//
//   node --test __tests__/format.test.ts
//
// Covers the exact string shape produced by Intl.NumberFormat('bg-BG', …)
// so future locale-CLDR updates surface as a test failure rather than
// silently drifting the price row copy.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EUR_TO_BGN_PEG,
  formatBGNFromEuroCents,
  isBulgarianMarketplace,
} from '../lib/bgn.ts';

// Non-breaking space used by Intl between number and currency symbol.
const NBSP = '\u00A0';

test('EUR_TO_BGN_PEG is the fixed currency-board peg', () => {
  assert.equal(EUR_TO_BGN_PEG, 1.95583);
});

test('formatBGNFromEuroCents(10000) → 196 лв.', () => {
  // 10000 cents = €100 × 1.95583 = 195.583 BGN, rounded to 196 with
  // maximumFractionDigits: 0. Exact string shape locked in below.
  assert.equal(formatBGNFromEuroCents(10000), `196${NBSP}лв.`);
});

test('formatBGNFromEuroCents(5000) → 98 лв.', () => {
  // 5000 cents = €50 × 1.95583 = 97.79 BGN → 98 when rounded.
  assert.equal(formatBGNFromEuroCents(5000), `98${NBSP}лв.`);
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
