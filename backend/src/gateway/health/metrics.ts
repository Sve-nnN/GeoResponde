import type { HealthSample } from './types.js';

/**
 * Pure aggregations over an ordered (oldest -> newest) HealthSample[] — the
 * exact shape RingBuffer.toArray() yields. Stateless and side-effect free so
 * they are trivially unit-testable and reusable by the Phase 18 endpoint.
 * They deliver only the raw HEALTH-04/05/06 values; badge/availability%/
 * sparkline rendering is a Phase 19 concern.
 */

/**
 * Rounded arithmetic mean of latency over UP samples only (HEALTH-04). DOWN
 * samples carry latencyMs null and are excluded from both the numerator and
 * denominator. Returns null when there are no UP samples yet (warming up).
 */
export function averageLatencyMs(samples: readonly HealthSample[]): number | null {
  const upLatencies = samples
    .filter((s) => s.outcome === 'up' && typeof s.latencyMs === 'number')
    .map((s) => s.latencyMs as number);
  if (upLatencies.length === 0) return null;
  const sum = upLatencies.reduce((acc, ms) => acc + ms, 0);
  return Math.round(sum / upLatencies.length);
}

/**
 * Timestamp of the most recent UP sample, scanning newest to oldest
 * (HEALTH-05). Persists through a current failing streak within the given
 * array. Returns null when there has never been an UP sample.
 */
export function lastSuccessAt(samples: readonly HealthSample[]): number | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].outcome === 'up') return samples[i].timestamp;
  }
  return null;
}

/**
 * Count of trailing DOWN samples from the newest backward, stopping at the
 * first UP (HEALTH-06). Zero when the most recent sample is UP or the array
 * is empty; equals the array length when every sample is DOWN.
 */
export function consecutiveFailures(samples: readonly HealthSample[]): number {
  let count = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].outcome === 'down') count++;
    else break;
  }
  return count;
}
