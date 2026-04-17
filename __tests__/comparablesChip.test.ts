// Unit tests for the XOL-16 v0.8 evidence-chip presenter.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test __tests__/comparablesChip.test.ts
//
// Covers every row of the XOL-16 allowlist, including defensive negative
// inputs and the 365d+ age cap.

import test from 'node:test';
import assert from 'node:assert/strict';

import { comparablesChipText } from '../lib/comparables.ts';

test('count=0 → null (chip does not render) regardless of median', () => {
  assert.equal(comparablesChipText(0, 0), null);
  assert.equal(comparablesChipText(0, 12), null);
  assert.equal(comparablesChipText(0, 999), null);
});

test('count=undefined → null (treat as 0, don\'t render)', () => {
  assert.equal(comparablesChipText(undefined, undefined), null);
  assert.equal(comparablesChipText(undefined, 12), null);
});

test('count=1, median=0 → singular noun, no suffix', () => {
  assert.equal(comparablesChipText(1, 0), 'Based on 1 NL comparable');
});

test('count=1, median>0 → singular noun with median suffix', () => {
  assert.equal(comparablesChipText(1, 12), 'Based on 1 NL comparable · median 12d old');
});

test('count>1, median=0 → plural noun, no suffix (drop entirely)', () => {
  assert.equal(comparablesChipText(7, 0), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(45, 0), 'Based on 45 NL comparables');
});

test('count>1, 0<median≤365 → plural noun with median suffix', () => {
  assert.equal(comparablesChipText(7, 12), 'Based on 7 NL comparables · median 12d old');
  assert.equal(comparablesChipText(7, 365), 'Based on 7 NL comparables · median 365d old');
});

test('count>1, median>365 → plural noun with 365d+ cap', () => {
  assert.equal(comparablesChipText(7, 366), 'Based on 7 NL comparables · median 365d+ old');
  assert.equal(comparablesChipText(7, 9999), 'Based on 7 NL comparables · median 365d+ old');
});

test('count=1, median>365 → singular noun with 365d+ cap', () => {
  assert.equal(comparablesChipText(1, 500), 'Based on 1 NL comparable · median 365d+ old');
});

test('count<0 → treat as 0 (null)', () => {
  assert.equal(comparablesChipText(-1, 12), null);
  assert.equal(comparablesChipText(-5, 0), null);
});

test('median<0 → treat as 0 (drop suffix)', () => {
  assert.equal(comparablesChipText(7, -1), 'Based on 7 NL comparables');
  assert.equal(comparablesChipText(1, -1), 'Based on 1 NL comparable');
});

test('count=NaN (typeof number) → treat as 0 via guard (null)', () => {
  // NaN is typeof "number" but fails the > 0 comparison, so it falls into
  // the safeCount = 0 branch and returns null.
  assert.equal(comparablesChipText(NaN, 12), null);
});

test('median=NaN → treat as 0 (drop suffix)', () => {
  assert.equal(comparablesChipText(7, NaN), 'Based on 7 NL comparables');
});

test('fractional count → floor (defensive)', () => {
  assert.equal(comparablesChipText(7.8, 0), 'Based on 7 NL comparables');
});

test('fractional median → floor (defensive)', () => {
  assert.equal(comparablesChipText(7, 12.9), 'Based on 7 NL comparables · median 12d old');
});
