// Unit tests for the currency-status presenter added in XOL-61 (TRUST-1).
// The presenter is a pure function — deliberately kept in its own module
// with no React / fetch / cross-file imports so it runs under the Node
// built-in test runner without any transpile or DOM stub.
//
//   node --test __tests__/currencyStatus.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';

import { currencyStatusMeta } from '../lib/currencyStatus.ts';

test('eur_native → neutral-green badge with canonical testid', () => {
  const meta = currencyStatusMeta('eur_native');
  assert.ok(meta, 'expected meta to be non-null');
  assert.equal(meta!.label, 'EUR в обявата');
  assert.equal(meta!.testid, 'currency-status-badge-eur-native');
  assert.equal(meta!.variant, 'eur-native');
  assert.ok(meta!.ariaLabel.length > 0);
});

test('converted_from_bgn → neutral badge with ≈ prefix + canonical testid', () => {
  const meta = currencyStatusMeta('converted_from_bgn');
  assert.ok(meta);
  assert.equal(meta!.label, '≈ от лв (BGN)');
  assert.equal(meta!.testid, 'currency-status-badge-converted');
  assert.equal(meta!.variant, 'converted');
});

test('unknown → warning badge with canonical testid', () => {
  const meta = currencyStatusMeta('unknown');
  assert.ok(meta);
  assert.equal(meta!.label, 'Валута неясна');
  assert.equal(meta!.testid, 'currency-status-badge-unknown');
  assert.equal(meta!.variant, 'unknown');
});

test('empty string → null (no visual noise on pre-M2 rows)', () => {
  assert.equal(currencyStatusMeta(''), null);
});

test('undefined → null', () => {
  assert.equal(currencyStatusMeta(undefined), null);
});

test('null → null', () => {
  assert.equal(currencyStatusMeta(null), null);
});
