// Unit tests for the evidence-chip presenter.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test __tests__/comparablesChip.test.ts
//
// Covers every row of the allowlist plus per-country prefix
// ("NL" for NL markets, "BG" for OLX BG, generic for unknown),
// including defensive negative inputs and the 365d+ age cap.

import test from 'node:test';
import assert from 'node:assert/strict';

import { comparablesChipText, comparablesConfidenceLevel } from '../lib/comparables.ts';

// ----- NL (Marktplaats / Vinted NL) -----------------------------------------

test('NL: count=0 → "No price data yet" regardless of median', () => {
  assert.equal(comparablesChipText(0, 0, 'NL'), 'No price data yet');
  assert.equal(comparablesChipText(0, 12, 'NL'), 'No price data yet');
  assert.equal(comparablesChipText(0, 999, 'NL'), 'No price data yet');
});

test("NL: count=undefined → 'No price data yet' (treat as 0)", () => {
  assert.equal(comparablesChipText(undefined, undefined, 'NL'), 'No price data yet');
  assert.equal(comparablesChipText(undefined, 12, 'NL'), 'No price data yet');
});

test('NL: count=1, median=0 → singular noun, no suffix (low confidence)', () => {
  assert.equal(comparablesChipText(1, 0, 'NL'), 'Estimated · 1 NL comparable');
});

test('NL: count=1, median>0 → singular noun with median suffix (low confidence)', () => {
  assert.equal(comparablesChipText(1, 12, 'NL'), 'Estimated · 1 NL comparable · median 12d old');
});

test('NL: count=4 (boundary), median=0 → still low-confidence prefix', () => {
  assert.equal(comparablesChipText(4, 0, 'NL'), 'Estimated · 4 NL comparables');
});

test('NL: count=5 (boundary), median=0 → switches to "Based on"', () => {
  assert.equal(comparablesChipText(5, 0, 'NL'), 'Based on 5 NL comparables');
});

test('NL: count>4, median=0 → plural noun, no suffix', () => {
  assert.equal(comparablesChipText(7, 0, 'NL'), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(45, 0, 'NL'), 'Based on 45 NL comparables');
});

test('NL: count>4, 0<median≤365 → plural noun with median suffix', () => {
  assert.equal(comparablesChipText(7, 12, 'NL'), 'Based on 7 NL comparables · median 12d old');
  assert.equal(comparablesChipText(7, 365, 'NL'), 'Based on 7 NL comparables · median 365d old');
});

test('NL: count>4, median>365 → plural noun with 365d+ cap', () => {
  assert.equal(comparablesChipText(7, 366, 'NL'), 'Based on 7 NL comparables · median 365d+ old');
  assert.equal(comparablesChipText(7, 9999, 'NL'), 'Based on 7 NL comparables · median 365d+ old');
});

test('NL: count=1, median>365 → singular noun with 365d+ cap (low confidence)', () => {
  assert.equal(comparablesChipText(1, 500, 'NL'), 'Estimated · 1 NL comparable · median 365d+ old');
});

test('NL: lowercase "nl" is normalized and still prefixes', () => {
  assert.equal(comparablesChipText(3, 0, 'nl'), 'Estimated · 3 NL comparables');
});

test('NL: count<0 → treat as 0 ("No price data yet")', () => {
  assert.equal(comparablesChipText(-1, 12, 'NL'), 'No price data yet');
  assert.equal(comparablesChipText(-5, 0, 'NL'), 'No price data yet');
});

test('NL: median<0 → treat as 0 (drop suffix)', () => {
  assert.equal(comparablesChipText(7, -1, 'NL'), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(1, -1, 'NL'), 'Estimated · 1 NL comparable');
});

test('NL: count=NaN → treat as 0 via guard ("No price data yet")', () => {
  // NaN is typeof "number" but fails the > 0 comparison, so it falls into
  // the safeCount = 0 branch and returns "No price data yet".
  assert.equal(comparablesChipText(NaN, 12, 'NL'), 'No price data yet');
});

test('NL: median=NaN → treat as 0 (drop suffix)', () => {
  assert.equal(comparablesChipText(7, NaN, 'NL'), 'Based on 7 NL comparables');
});

test('NL: fractional count → floor (defensive)', () => {
  assert.equal(comparablesChipText(7.8, 0, 'NL'), 'Based on 7 NL comparables');
});

test('NL: fractional median → floor (defensive)', () => {
  assert.equal(comparablesChipText(7, 12.9, 'NL'), 'Based on 7 NL comparables · median 12d old');
});

// ----- BG (OLX BG) ----------------------------------------------------------

test('BG: count=1, median=0 → "Estimated · 1 BG comparable" (low confidence)', () => {
  assert.equal(comparablesChipText(1, 0, 'BG'), 'Estimated · 1 BG comparable');
});

test('BG: count=4 (boundary), median=0 → "Estimated · 4 BG comparables" (low confidence)', () => {
  assert.equal(comparablesChipText(4, 0, 'BG'), 'Estimated · 4 BG comparables');
});

test('BG: count=4, 0<median≤365 → low-confidence plural BG with median suffix', () => {
  assert.equal(comparablesChipText(4, 30, 'BG'), 'Estimated · 4 BG comparables · median 30d old');
});

test('BG: count=4, median>365 → 365d+ cap still applies (low confidence)', () => {
  assert.equal(
    comparablesChipText(4, 999, 'BG'),
    'Estimated · 4 BG comparables · median 365d+ old',
  );
});

test('BG: count=5, median=0 → "Based on 5 BG comparables" (medium confidence)', () => {
  assert.equal(comparablesChipText(5, 0, 'BG'), 'Based on 5 BG comparables');
});

// ----- Unknown / missing country ---------------------------------------

test('Unknown country → generic copy (no country prefix)', () => {
  assert.equal(comparablesChipText(5, 0, 'DK'), 'Based on 5 comparables');
  assert.equal(comparablesChipText(1, 0, 'DK'), 'Estimated · 1 comparable');
  assert.equal(comparablesChipText(5, 12, 'DK'), 'Based on 5 comparables · median 12d old');
  assert.equal(comparablesChipText(5, 0, 'ZZ'), 'Based on 5 comparables');
});

test('Missing countryCode → generic copy (no country prefix)', () => {
  assert.equal(comparablesChipText(5, 0), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, undefined), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, null), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, ''), 'Based on 5 comparables');
});

// ----- XOL-104: new required cases from brief ------------------------------------

test('XOL-104: count=0, median=0, BG → "No price data yet"', () => {
  assert.equal(comparablesChipText(0, 0, 'BG'), 'No price data yet');
});

test('XOL-104: count=0, median=99, NL → "No price data yet" (no median suffix at count=0)', () => {
  assert.equal(comparablesChipText(0, 99, 'NL'), 'No price data yet');
});

test('XOL-104: count=1, median=0, BG → "Estimated · 1 BG comparable"', () => {
  assert.equal(comparablesChipText(1, 0, 'BG'), 'Estimated · 1 BG comparable');
});

test('XOL-104: count=3, median=5, BG → "Estimated · 3 BG comparables · median 5d old"', () => {
  assert.equal(comparablesChipText(3, 5, 'BG'), 'Estimated · 3 BG comparables · median 5d old');
});

test('XOL-104: count=5, median=0, BG → "Based on 5 BG comparables" (5+ unchanged)', () => {
  assert.equal(comparablesChipText(5, 0, 'BG'), 'Based on 5 BG comparables');
});

test('XOL-104: count=20, median=2, BG → "Based on 20 BG comparables · median 2d old" (unchanged)', () => {
  assert.equal(comparablesChipText(20, 2, 'BG'), 'Based on 20 BG comparables · median 2d old');
});

// ----- comparablesConfidenceLevel -------------------------------------------

test('comparablesConfidenceLevel: 0 → "none"', () => {
  assert.equal(comparablesConfidenceLevel(0), 'none');
});

test('comparablesConfidenceLevel: undefined → "none"', () => {
  assert.equal(comparablesConfidenceLevel(undefined), 'none');
});

test('comparablesConfidenceLevel: 1 → "low"', () => {
  assert.equal(comparablesConfidenceLevel(1), 'low');
});

test('comparablesConfidenceLevel: 4 → "low"', () => {
  assert.equal(comparablesConfidenceLevel(4), 'low');
});

test('comparablesConfidenceLevel: 5 → "medium"', () => {
  assert.equal(comparablesConfidenceLevel(5), 'medium');
});

test('comparablesConfidenceLevel: 19 → "medium"', () => {
  assert.equal(comparablesConfidenceLevel(19), 'medium');
});

test('comparablesConfidenceLevel: 20 → "high"', () => {
  assert.equal(comparablesConfidenceLevel(20), 'high');
});

test('comparablesConfidenceLevel: 100 → "high"', () => {
  assert.equal(comparablesConfidenceLevel(100), 'high');
});
