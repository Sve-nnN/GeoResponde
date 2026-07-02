import { describe, it, expect } from 'vitest';
import { averageLatencyMs, lastSuccessAt, consecutiveFailures } from '../metrics.js';
import { classifyOutcome, HealthSample } from '../types.js';

function sample(overrides: Partial<HealthSample> = {}): HealthSample {
  return {
    outcome: 'up',
    latencyMs: 100,
    timestamp: 0,
    ...overrides,
  };
}

describe('averageLatencyMs', () => {
  it('returns null for an empty array (warming up)', () => {
    expect(averageLatencyMs([])).toBeNull();
  });

  it('returns null when every sample is DOWN', () => {
    const samples = [
      sample({ outcome: 'down', latencyMs: null }),
      sample({ outcome: 'down', latencyMs: null }),
    ];
    expect(averageLatencyMs(samples)).toBeNull();
  });

  it('excludes down samples from a mixed array and returns the mean of ups', () => {
    const samples = [
      sample({ outcome: 'up', latencyMs: 100 }),
      sample({ outcome: 'down', latencyMs: null }),
      sample({ outcome: 'up', latencyMs: 150 }),
      sample({ outcome: 'up', latencyMs: 175 }),
    ];
    expect(averageLatencyMs(samples)).toBe(142);
  });

  it('returns an integer (rounded)', () => {
    const samples = [
      sample({ outcome: 'up', latencyMs: 100 }),
      sample({ outcome: 'up', latencyMs: 150 }),
      sample({ outcome: 'up', latencyMs: 175 }),
    ];
    expect(averageLatencyMs(samples)).toBe(142);
    expect(Number.isInteger(averageLatencyMs(samples))).toBe(true);
  });
});

describe('lastSuccessAt', () => {
  it('returns null for an empty array', () => {
    expect(lastSuccessAt([])).toBeNull();
  });

  it('returns null when every sample is DOWN', () => {
    const samples = [sample({ outcome: 'down', latencyMs: null, timestamp: 1 })];
    expect(lastSuccessAt(samples)).toBeNull();
  });

  it('returns the most recent UP timestamp even when later samples are DOWN', () => {
    const samples = [
      sample({ outcome: 'up', timestamp: 10 }),
      sample({ outcome: 'up', timestamp: 20 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 30 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 40 }),
    ];
    expect(lastSuccessAt(samples)).toBe(20);
  });
});

describe('consecutiveFailures', () => {
  it('returns 0 for an empty array', () => {
    expect(consecutiveFailures([])).toBe(0);
  });

  it('counts a trailing run of DOWN after an UP', () => {
    const samples = [
      sample({ outcome: 'up', timestamp: 1 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 2 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 3 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 4 }),
    ];
    expect(consecutiveFailures(samples)).toBe(3);
  });

  it('returns 0 when the most recent sample is UP, regardless of earlier failures', () => {
    const samples = [
      sample({ outcome: 'down', latencyMs: null, timestamp: 1 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 2 }),
      sample({ outcome: 'up', timestamp: 3 }),
    ];
    expect(consecutiveFailures(samples)).toBe(0);
  });

  it('returns n for an all-DOWN array of length n', () => {
    const samples = [
      sample({ outcome: 'down', latencyMs: null, timestamp: 1 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 2 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 3 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 4 }),
      sample({ outcome: 'down', latencyMs: null, timestamp: 5 }),
    ];
    expect(consecutiveFailures(samples)).toBe(5);
  });

  it('not_found never becomes a HealthSample, so these functions never see it', () => {
    // classifyOutcome gates recording; building samples only through this
    // path means 'not_found' can never appear in the array these functions read.
    const statuses: Array<'ok' | 'empty' | 'error' | 'not_found'> = ['ok', 'not_found', 'error', 'not_found'];
    const samples: HealthSample[] = [];
    let ts = 0;
    for (const status of statuses) {
      const outcome = classifyOutcome(status);
      if (outcome === null) continue; // not_found excluded, never recorded
      samples.push(sample({ outcome, latencyMs: outcome === 'up' ? 100 : null, timestamp: ts++ }));
    }
    expect(samples).toHaveLength(2);
    expect(averageLatencyMs(samples)).toBe(100);
    expect(consecutiveFailures(samples)).toBe(1);
  });
});
