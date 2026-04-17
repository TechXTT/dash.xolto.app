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

import { comparablesChipText } from '../lib/comparables.ts';

// ----- NL (Marktplaats / Vinted NL) -----------------------------------------

test('NL: count=0 → null (chip does not render) regardless of median', () => {
  assert.equal(comparablesChipText(0, 0, 'NL'), null);
  assert.equal(comparablesChipText(0, 12, 'NL'), null);
  assert.equal(comparablesChipText(0, 999, 'NL'), null);
});

test("NL: count=undefined → null (treat as 0, don't render)", () => {
  assert.equal(comparablesChipText(undefined, undefined, 'NL'), null);
  assert.equal(comparablesChipText(undefined, 12, 'NL'), null);
});

test('NL: count=1, median=0 → singular noun, no suffix', () => {
  assert.equal(comparablesChipText(1, 0, 'NL'), 'Based on 1 NL comparable');
});

test('NL: count=1, median>0 → singular noun with median suffix', () => {
  assert.equal(comparablesChipText(1, 12, 'NL'), 'Based on 1 NL comparable · median 12d old');
});

test('NL: count>1, median=0 → plural noun, no suffix', () => {
  assert.equal(comparablesChipText(7, 0, 'NL'), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(45, 0, 'NL'), 'Based on 45 NL comparables');
});

test('NL: count>1, 0<median≤365 → plural noun with median suffix', () => {
  assert.equal(comparablesChipText(7, 12, 'NL'), 'Based on 7 NL comparables · median 12d old');
  assert.equal(comparablesChipText(7, 365, 'NL'), 'Based on 7 NL comparables · median 365d old');
});

test('NL: count>1, median>365 → plural noun with 365d+ cap', () => {
  assert.equal(comparablesChipText(7, 366, 'NL'), 'Based on 7 NL comparables · median 365d+ old');
  assert.equal(comparablesChipText(7, 9999, 'NL'), 'Based on 7 NL comparables · median 365d+ old');
});

test('NL: count=1, median>365 → singular noun with 365d+ cap', () => {
  assert.equal(comparablesChipText(1, 500, 'NL'), 'Based on 1 NL comparable · median 365d+ old');
});

test('NL: lowercase "nl" is normalized and still prefixes', () => {
  assert.equal(comparablesChipText(3, 0, 'nl'), 'Based on 3 NL comparables');
});

test('NL: count<0 → treat as 0 (null)', () => {
  assert.equal(comparablesChipText(-1, 12, 'NL'), null);
  assert.equal(comparablesChipText(-5, 0, 'NL'), null);
});

test('NL: median<0 → treat as 0 (drop suffix)', () => {
  assert.equal(comparablesChipText(7, -1, 'NL'), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(1, -1, 'NL'), 'Based on 1 NL comparable');
});

test('NL: count=NaN → treat as 0 via guard (null)', () => {
  // NaN is typeof "number" but fails the > 0 comparison, so it falls into
  // the safeCount = 0 branch and returns null.
  assert.equal(comparablesChipText(NaN, 12, 'NL'), null);
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

test('BG: count=1, median=0 → "Based on 1 BG comparable"', () => {
  assert.equal(comparablesChipText(1, 0, 'BG'), 'Based on 1 BG comparable');
});

test('BG: count>1, median=0 → "Based on N BG comparables"', () => {
  assert.equal(comparablesChipText(4, 0, 'BG'), 'Based on 4 BG comparables');
});

test('BG: count>1, 0<median≤365 → plural BG with median suffix', () => {
  assert.equal(comparablesChipText(4, 30, 'BG'), 'Based on 4 BG comparables · median 30d old');
});

test('BG: median>365 → 365d+ cap still applies', () => {
  assert.equal(comparablesChipText(4, 999, 'BG'), 'Based on 4 BG comparables · median 365d+ old');
});

// ----- Unknown / missing country ---------------------------------------

test('Unknown country → generic copy (no country prefix)', () => {
  assert.equal(comparablesChipText(5, 0, 'DK'), 'Based on 5 comparables');
  assert.equal(comparablesChipText(1, 0, 'DK'), 'Based on 1 comparable');
  assert.equal(comparablesChipText(5, 12, 'DK'), 'Based on 5 comparables · median 12d old');
  assert.equal(comparablesChipText(5, 0, 'ZZ'), 'Based on 5 comparables');
});

test('Missing countryCode → generic copy (no country prefix)', () => {
  assert.equal(comparablesChipText(5, 0), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, undefined), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, null), 'Based on 5 comparables');
  assert.equal(comparablesChipText(5, 0, ''), 'Based on 5 comparables');
});
