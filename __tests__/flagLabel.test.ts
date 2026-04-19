// Unit tests for flagLabel utility (XOL-80).
// Runs under Node's built-in test runner with native TS support:
//
//   node --test __tests__/flagLabel.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';

import { flagLabel } from '../lib/flags.ts';

test('flagLabel: off_platform_redirect → "⚠ Off-platform contact"', () => {
  assert.equal(flagLabel('off_platform_redirect'), '⚠ Off-platform contact');
});

test('flagLabel: stale_listing → "May be sold — check availability"', () => {
  assert.equal(flagLabel('stale_listing'), 'May be sold \u2014 check availability');
});

test('flagLabel: unknown_flag → "unknown flag" (underscore-to-space fallback)', () => {
  assert.equal(flagLabel('unknown_flag'), 'unknown flag');
});
