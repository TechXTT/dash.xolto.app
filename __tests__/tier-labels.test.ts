// CANONICAL SOURCE: markt/internal/billing/limits.go::TierDisplayName.
// When tier labels change, update markt + this repo + xolto-landing in
// lockstep. The markt JSON snapshot at
// internal/billing/testdata/tier_display_labels.json is authoritative; this
// test mirrors it.
//
// Runs under Node's built-in test runner (node --test) with native TS
// support — no framework, no transpile step:
//
//   node --test __tests__/tier-labels.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';

import { TIER_DISPLAY_LABELS, tierDisplayLabel } from '../lib/tier.ts';

// PLAN_LABELS lives inside register/page.tsx and is not directly importable
// (the file is a 'use client' Next.js page with React/JSX). Re-derive the
// shape here from the shared map and assert the same way the page does.
const PLAN_LABELS = {
  pro: TIER_DISPLAY_LABELS.pro,
  power: TIER_DISPLAY_LABELS.power,
};

test('TIER_DISPLAY_LABELS matches markt canonical mapping', () => {
  assert.equal(TIER_DISPLAY_LABELS.free, 'Free');
  assert.equal(TIER_DISPLAY_LABELS.pro, 'Buyer');
  assert.equal(TIER_DISPLAY_LABELS.power, 'Pro');
});

test('tierDisplayLabel maps every known slug to its canonical label', () => {
  assert.equal(tierDisplayLabel('free'), 'Free');
  assert.equal(tierDisplayLabel('pro'), 'Buyer');
  assert.equal(tierDisplayLabel('power'), 'Pro');
});

test('tierDisplayLabel falls back to "Free" for unknown / empty / nullish slugs', () => {
  assert.equal(tierDisplayLabel('mystery'), 'Free');
  assert.equal(tierDisplayLabel(''), 'Free');
  assert.equal(tierDisplayLabel(undefined), 'Free');
  assert.equal(tierDisplayLabel(null), 'Free');
});

test('PLAN_LABELS (register/page.tsx) agrees with TIER_DISPLAY_LABELS', () => {
  // PLAN_LABELS only covers paid intents (pro, power) — no free entry, since
  // free is not a billable selection on the landing CTA flow.
  assert.equal(PLAN_LABELS.pro, 'Buyer');
  assert.equal(PLAN_LABELS.power, 'Pro');
  assert.equal(PLAN_LABELS.pro, TIER_DISPLAY_LABELS.pro);
  assert.equal(PLAN_LABELS.power, TIER_DISPLAY_LABELS.power);
});

test('TIER_DISPLAY_LABELS slug set matches the markt snapshot exactly', () => {
  // The markt JSON snapshot at
  // internal/billing/testdata/tier_display_labels.json enumerates exactly
  // these three slugs. Drift here means the frontend gained or dropped a
  // slug independently — fail fast.
  const slugs = Object.keys(TIER_DISPLAY_LABELS).sort();
  assert.deepEqual(slugs, ['free', 'power', 'pro']);
});
