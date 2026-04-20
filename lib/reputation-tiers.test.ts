/**
 * lib/reputation-tiers.test.ts — Ship 7 J4 unit tests.
 *
 * Run with: `pnpm tsx --test lib/reputation-tiers.test.ts`
 * (Project has no shared test harness yet, so we use node:test directly.)
 *
 * Covers: each of the four tiers + boundaries + bounding clamps + edge inputs.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeExpiryHoursForWorker,
  getTierForAttestationCount,
} from './reputation-tiers'

describe('getTierForAttestationCount', () => {
  test('0 attestations → unknown', () => {
    assert.equal(getTierForAttestationCount(0).tier, 'unknown')
  })
  test('negative → unknown (defensive)', () => {
    assert.equal(getTierForAttestationCount(-5).tier, 'unknown')
  })
  test('NaN → unknown', () => {
    assert.equal(getTierForAttestationCount(Number.NaN).tier, 'unknown')
  })
  test('1 → new', () => {
    assert.equal(getTierForAttestationCount(1).tier, 'new')
  })
  test('4 (upper bound of new) → new', () => {
    assert.equal(getTierForAttestationCount(4).tier, 'new')
  })
  test('5 (lower bound of established) → established', () => {
    assert.equal(getTierForAttestationCount(5).tier, 'established')
  })
  test('19 (upper bound of established) → established', () => {
    assert.equal(getTierForAttestationCount(19).tier, 'established')
  })
  test('20 (lower bound of trusted) → trusted', () => {
    assert.equal(getTierForAttestationCount(20).tier, 'trusted')
  })
  test('10,000 → trusted', () => {
    assert.equal(getTierForAttestationCount(10000).tier, 'trusted')
  })
})

describe('computeExpiryHoursForWorker', () => {
  test('unknown worker gets requested duration', () => {
    assert.equal(computeExpiryHoursForWorker(0, 12), 12)
    assert.equal(computeExpiryHoursForWorker(0, 1), 1)
    assert.equal(computeExpiryHoursForWorker(0, 168), 168)
  })

  test('new worker floor is 24h minimum', () => {
    assert.equal(computeExpiryHoursForWorker(1, 1), 24)
    assert.equal(computeExpiryHoursForWorker(1, 12), 24)
    assert.equal(computeExpiryHoursForWorker(1, 48), 48)
  })

  test('established worker scales 0.75x with floor of 6h', () => {
    assert.equal(computeExpiryHoursForWorker(10, 1), 6)
    assert.equal(computeExpiryHoursForWorker(10, 4), 6)
    assert.equal(computeExpiryHoursForWorker(10, 8), Math.round(8 * 0.75))
    assert.equal(computeExpiryHoursForWorker(10, 48), Math.round(48 * 0.75))
  })

  test('trusted worker scales 0.5x with floor of 2h', () => {
    assert.equal(computeExpiryHoursForWorker(50, 1), 2)
    assert.equal(computeExpiryHoursForWorker(50, 2), 2)
    assert.equal(computeExpiryHoursForWorker(50, 8), 4)
    assert.equal(computeExpiryHoursForWorker(50, 168), 84)
  })

  test('result bounded to [minHours, maxHours]', () => {
    assert.equal(computeExpiryHoursForWorker(0, 0.5), 1)
    assert.equal(computeExpiryHoursForWorker(0, 10000), 168)
    assert.equal(computeExpiryHoursForWorker(0, -5), 1)
  })

  test('custom bounds override defaults', () => {
    assert.equal(computeExpiryHoursForWorker(0, 100, 1, 50), 50)
    assert.equal(computeExpiryHoursForWorker(0, 0.1, 3, 48), 3)
  })

  test('tier downgrade safety — a trusted worker asking for 1h gets 2h floor', () => {
    assert.equal(computeExpiryHoursForWorker(25, 1), 2)
  })

  test('boundary: exactly at tier threshold', () => {
    assert.equal(getTierForAttestationCount(5).tier, 'established')
    assert.equal(getTierForAttestationCount(20).tier, 'trusted')
  })
})
