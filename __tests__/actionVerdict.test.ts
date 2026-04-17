// Unit test for the RecommendedAction → verdict presenter mapping.
// Runs under Node's built-in test runner (node --test) with native TS
// support (Node 22.6+ / 23+). No framework dep, no transpile step.
//
// Usage:
//   node --test __tests__/actionVerdict.test.ts
//
// Covers: all 4 enum values + missing/unknown → "Ask seller" default.

import test from 'node:test';
import assert from 'node:assert/strict';

import { actionVerdict, primaryCta } from '../lib/verdict.ts';

test('actionVerdict maps buy → Buy / buy variant / approve CTA', () => {
  const v = actionVerdict('buy');
  assert.equal(v.key, 'buy');
  assert.equal(v.label, 'Buy');
  assert.equal(v.variant, 'buy');
  assert.equal(primaryCta('buy'), 'approve');
});

test('actionVerdict maps negotiate → Negotiate / negotiate variant / draft CTA', () => {
  const v = actionVerdict('negotiate');
  assert.equal(v.key, 'negotiate');
  assert.equal(v.label, 'Negotiate');
  assert.equal(v.variant, 'negotiate');
  assert.equal(primaryCta('negotiate'), 'draft');
});

test('actionVerdict maps ask_seller → Ask seller / ask_seller variant / ask CTA', () => {
  const v = actionVerdict('ask_seller');
  assert.equal(v.key, 'ask_seller');
  assert.equal(v.label, 'Ask seller');
  assert.equal(v.variant, 'ask_seller');
  assert.equal(primaryCta('ask_seller'), 'ask');
});

test('actionVerdict maps skip → Skip / skip variant / dismiss CTA', () => {
  const v = actionVerdict('skip');
  assert.equal(v.key, 'skip');
  assert.equal(v.label, 'Skip');
  assert.equal(v.variant, 'skip');
  assert.equal(primaryCta('skip'), 'dismiss');
});

test('actionVerdict defaults missing/undefined → Ask seller', () => {
  const missing = actionVerdict(undefined);
  assert.equal(missing.key, 'ask_seller');
  assert.equal(missing.label, 'Ask seller');
  assert.equal(missing.variant, 'ask_seller');
  assert.equal(primaryCta(undefined), 'ask');

  const nullish = actionVerdict(null);
  assert.equal(nullish.key, 'ask_seller');
  assert.equal(nullish.label, 'Ask seller');

  const empty = actionVerdict('');
  assert.equal(empty.key, 'ask_seller');
  assert.equal(empty.label, 'Ask seller');
});

test('actionVerdict defaults unknown enum value → Ask seller (trust-preservation)', () => {
  const unknown = actionVerdict('definitely_not_a_real_action');
  assert.equal(unknown.key, 'ask_seller');
  assert.equal(unknown.label, 'Ask seller');
  assert.equal(unknown.variant, 'ask_seller');
  assert.equal(primaryCta('definitely_not_a_real_action'), 'ask');
});
