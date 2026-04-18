// Guards against the XOL-64 crash: Safari threw "null is not an object
// (evaluating 'e.filter')" when the markt backend serialised an empty
// shortlist as JSON `null` instead of `[]`. These tests lock in the
// null/undefined tolerance so the regression can't reappear silently.
//
//   node --test __tests__/shortlist.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';

import type { ShortlistEntry } from '../lib/api.ts';
import { normalizeShortlist } from '../lib/shortlist.ts';

test('normalizeShortlist(null) returns []', () => {
  assert.deepEqual(normalizeShortlist(null), []);
});

test('normalizeShortlist(undefined) returns []', () => {
  assert.deepEqual(normalizeShortlist(undefined), []);
});

test('normalizeShortlist([]) returns []', () => {
  assert.deepEqual(normalizeShortlist([]), []);
});

test('normalizeShortlist keeps entries whose Status is not "removed"', () => {
  const entries = [
    { ItemID: 'a', Status: 'active' },
    { ItemID: 'b', Status: 'removed' },
    { ItemID: 'c', Status: 'active' },
  ] as unknown as ShortlistEntry[];

  const kept = normalizeShortlist(entries);
  assert.deepEqual(
    kept.map((e) => e.ItemID),
    ['a', 'c'],
  );
});

test('normalizeShortlist drops all entries when all are removed', () => {
  const entries = [
    { ItemID: 'a', Status: 'removed' },
    { ItemID: 'b', Status: 'removed' },
  ] as unknown as ShortlistEntry[];

  assert.deepEqual(normalizeShortlist(entries), []);
});
