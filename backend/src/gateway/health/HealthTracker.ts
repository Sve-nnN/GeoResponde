import { RingBuffer } from './ringBuffer.js';
import { classifyOutcome, HealthSample, HEALTH_WINDOW } from './types.js';

/**
 * Volatile, per-provider health tracker. Follows the VolatileTtlCache ethos
 * from transports/cache.ts: VOLATILE ONLY, in-memory, no persistence, no
 * Redis/DB — history and counters reset on cold start and are per-instance
 * (the proposal's disclosed tradeoff).
 *
 * Each provider gets a windowed RingBuffer<HealthSample> (capacity
 * HEALTH_WINDOW) for latency + response history, PLUS two INDEPENDENT
 * fields — lastSuccessAt and consecutiveFailures — that are updated
 * directly on every record() rather than derived by scanning the windowed
 * buffer. This is required (FEATURES.md "Dependency Notes"): a failure
 * streak longer than HEALTH_WINDOW must not evict the last known success
 * time or cap the failure count at the window size.
 *
 * Stores only outcome + latency + timestamp (+ the two derived counters)
 * per sample — never a query string or payload (no-PII rule).
 */
interface ProviderHealthRecord {
  buffer: RingBuffer<HealthSample>;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
}

export class HealthTracker {
  private readonly providers = new Map<string, ProviderHealthRecord>();

  /**
   * Record one probe result for a provider. `not_found` (no adapter
   * registered) is excluded entirely (HEALTH-07): it touches neither the
   * windowed buffer nor either independent field.
   */
  record(
    providerId: string,
    status: 'ok' | 'empty' | 'error' | 'not_found',
    latencyMs: number,
    timestamp: number = Date.now(),
  ): void {
    const outcome = classifyOutcome(status);
    if (outcome === null) return; // not_found: not a health signal, do not record

    let record = this.providers.get(providerId);
    if (!record) {
      record = { buffer: new RingBuffer<HealthSample>(HEALTH_WINDOW), lastSuccessAt: null, consecutiveFailures: 0 };
      this.providers.set(providerId, record);
    }

    record.buffer.push({
      outcome,
      latencyMs: outcome === 'up' ? latencyMs : null,
      timestamp,
    });

    if (outcome === 'up') {
      record.lastSuccessAt = timestamp;
      record.consecutiveFailures = 0;
    } else {
      record.consecutiveFailures += 1;
      // lastSuccessAt intentionally left unchanged.
    }
  }

  /** Windowed samples for a provider, oldest first; [] when never recorded (warming up). */
  samples(providerId: string): HealthSample[] {
    return this.providers.get(providerId)?.buffer.toArray() ?? [];
  }

  /** Independent last-success timestamp; null when the provider has never been up. */
  lastSuccessAt(providerId: string): number | null {
    return this.providers.get(providerId)?.lastSuccessAt ?? null;
  }

  /** Independent, unbounded consecutive-failure count; 0 when unknown or never failed. */
  consecutiveFailures(providerId: string): number {
    return this.providers.get(providerId)?.consecutiveFailures ?? 0;
  }
}
