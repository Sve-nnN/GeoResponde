import { describe, it, expect } from 'vitest';
import {
  classifyBadge,
  formatAvailability,
  buildSparkline,
  FRONTEND_DOWN_THRESHOLD,
  type ProviderHealthSnapshot,
  type HealthSample,
} from './health';

function sample(outcome: 'up' | 'down', latencyMs: number | null, timestamp = 0): HealthSample {
  return { outcome, latencyMs, timestamp };
}

function snapshot(overrides: Partial<ProviderHealthSnapshot>): ProviderHealthSnapshot {
  return {
    averageLatencyMs: null,
    lastSuccessAt: null,
    consecutiveFailures: 0,
    samples: [],
    up: 0,
    total: 0,
    ...overrides,
  };
}

describe('FRONTEND_DOWN_THRESHOLD', () => {
  it('mirrors the backend DOWN_THRESHOLD of 3', () => {
    expect(FRONTEND_DOWN_THRESHOLD).toBe(3);
  });
});

describe('classifyBadge', () => {
  it('classifies total === 0 as warming, never healthy/100%', () => {
    const snap = snapshot({ total: 0, up: 0, samples: [] });
    expect(classifyBadge(snap)).toBe('warming');
  });

  it('classifies consecutiveFailures >= 3 as down', () => {
    const snap = snapshot({
      total: 5,
      up: 2,
      consecutiveFailures: 3,
      samples: [sample('down', null, 3), sample('down', null, 2), sample('down', null, 1)],
    });
    expect(classifyBadge(snap)).toBe('down');
  });

  it('does NOT classify consecutiveFailures === 2 as down (boundary: down only at >= 3)', () => {
    const snap = snapshot({
      total: 5,
      up: 3,
      consecutiveFailures: 2,
      samples: [sample('down', null, 2), sample('down', null, 1)],
    });
    expect(classifyBadge(snap)).not.toBe('down');
    expect(classifyBadge(snap)).toBe('degrading');
  });

  it('classifies latest sample down with consecutiveFailures 1-2 as degrading', () => {
    const snap = snapshot({
      total: 5,
      up: 4,
      consecutiveFailures: 1,
      averageLatencyMs: 100,
      samples: [sample('up', 100, 1), sample('down', null, 2)],
    });
    expect(classifyBadge(snap)).toBe('degrading');
  });

  it('classifies latest up-sample latency > 2x average as degrading', () => {
    const snap = snapshot({
      total: 5,
      up: 5,
      consecutiveFailures: 0,
      averageLatencyMs: 100,
      samples: [sample('up', 100, 1), sample('up', 250, 2)],
    });
    expect(classifyBadge(snap)).toBe('degrading');
  });

  it('classifies all-up, latency near average, no failures as healthy', () => {
    const snap = snapshot({
      total: 5,
      up: 5,
      consecutiveFailures: 0,
      averageLatencyMs: 100,
      samples: [sample('up', 100, 1), sample('up', 110, 2)],
    });
    expect(classifyBadge(snap)).toBe('healthy');
  });

  it('classifies as healthy when averageLatencyMs is null but total > 0 and no failures (no false degrade)', () => {
    const snap = snapshot({
      total: 1,
      up: 1,
      consecutiveFailures: 0,
      averageLatencyMs: null,
      samples: [sample('up', 50, 1)],
    });
    expect(classifyBadge(snap)).toBe('healthy');
  });
});

describe('formatAvailability', () => {
  it('formats up=17/total=18 as "94% (17/18)"', () => {
    expect(formatAvailability(snapshot({ up: 17, total: 18 }))).toBe('94% (17/18)');
  });

  it('formats up=170/total=180 as "94% (170/180)" (sample size shown)', () => {
    expect(formatAvailability(snapshot({ up: 170, total: 180 }))).toBe('94% (170/180)');
  });

  it('returns the warming token for total === 0 (never "100%", never NaN/Infinity)', () => {
    const result = formatAvailability(snapshot({ up: 0, total: 0 }));
    expect(result).toBe('warming');
    expect(result).not.toContain('%');
  });

  it('formats up=0/total=3 as "0% (0/3)"', () => {
    expect(formatAvailability(snapshot({ up: 0, total: 3 }))).toBe('0% (0/3)');
  });
});

describe('buildSparkline', () => {
  const opts = { width: 100, height: 30, padding: 2 };

  it('returns empty points and empty markers for empty samples', () => {
    const result = buildSparkline([], opts);
    expect(result.points).toBe('');
    expect(result.markers).toEqual([]);
  });

  it('returns one point for a single up sample (degenerate but valid)', () => {
    const result = buildSparkline([sample('up', 100, 1)], opts);
    expect(result.points.trim().length).toBeGreaterThan(0);
    expect(result.points.trim().split(' ').length).toBe(1);
    expect(result.markers).toEqual([]);
  });

  it('excludes DOWN samples (null latency) from the polyline and emits baseline markers instead', () => {
    const result = buildSparkline(
      [sample('up', 100, 1), sample('down', null, 2), sample('up', 120, 3)],
      opts,
    );
    // polyline only has the two up points
    expect(result.points.trim().split(' ').length).toBe(2);
    // one baseline marker for the down sample
    expect(result.markers.length).toBe(1);
    expect(result.markers[0].y).toBe(opts.height - opts.padding);
  });

  it('returns an empty polyline and N baseline markers for an all-down window', () => {
    const samples = [sample('down', null, 1), sample('down', null, 2), sample('down', null, 3)];
    const result = buildSparkline(samples, opts);
    expect(result.points).toBe('');
    expect(result.markers.length).toBe(3);
  });

  it('never emits a NaN/non-finite coordinate for a non-finite latency (T-19-01)', () => {
    const samples = [sample('up', Number.NaN, 1), sample('up', 100, 2)];
    const result = buildSparkline(samples, opts);
    expect(result.points).not.toMatch(/NaN/);
    expect(result.points).not.toMatch(/Infinity/);
  });

  it('maps samples oldest-first (chronological left-to-right x-axis)', () => {
    // samples arrive oldest-first (RingBuffer.toArray order); x should increase with index
    const result = buildSparkline([sample('up', 50, 1), sample('up', 200, 2)], opts);
    const points = result.points.trim().split(' ').map((p) => p.split(',').map(Number));
    expect(points[0][0]).toBeLessThan(points[1][0]);
  });
});
