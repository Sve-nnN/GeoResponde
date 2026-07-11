import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fetchFunvisisEarthquakes } from '../service.js';
import { FunvisisCache } from '../cache.js';

const fixture = fs.readFileSync(
  path.join(__dirname, '../fixtures/catalog.csv'),
  'utf8',
);

function deps(fetchImpl: ReturnType<typeof vi.fn>) {
  return { cache: new FunvisisCache(), fetchText: fetchImpl as never };
}

describe('fetchFunvisisEarthquakes — live path', () => {
  it('normalizes the fixture and reports source=live', async () => {
    const fetchText = vi.fn().mockResolvedValue(fixture);
    const result = await fetchFunvisisEarthquakes({}, deps(fetchText));
    expect(result.source).toBe('live');
    expect(result.collection.features).toHaveLength(3);
    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(fetchText.mock.calls[0][0]).toContain(
      'raw.githubusercontent.com/kyleedwardbradley/funvisis-catalog',
    );
  });
});

describe('fetchFunvisisEarthquakes — start window filter', () => {
  it('filters out events before the start cutoff', async () => {
    const fetchText = vi.fn().mockResolvedValue(fixture);
    // ISC_syn_001 is 2003; FUNVISIS_R_syn_002 is 2026-05-15. A 2026-06-01
    // cutoff drops both, keeping only FUNVISIS_R_syn_001 (2026-06-30).
    const result = await fetchFunvisisEarthquakes({ start: '2026-06-01' }, deps(fetchText));
    expect(result.collection.features.map((f) => f.properties.id)).toEqual([
      'FUNVISIS_R_syn_001',
    ]);
  });

  it('shares one upstream fetch across different windows via cache', async () => {
    const fetchText = vi.fn().mockResolvedValue(fixture);
    const shared = deps(fetchText);
    await fetchFunvisisEarthquakes({ start: '2003-01-01' }, shared);
    const second = await fetchFunvisisEarthquakes({ start: '2026-06-01' }, shared);
    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(second.source).toBe('cache');
    expect(second.collection.features).toHaveLength(1);
  });
});

describe('fetchFunvisisEarthquakes — graceful degradation', () => {
  it('degrades to stale cache after a prior success', async () => {
    const fetchText = vi
      .fn()
      .mockResolvedValueOnce(fixture)
      .mockRejectedValueOnce(new Error('funvisis-catalog down'));
    const shared = { cache: new FunvisisCache({ ttlMs: -1 }), fetchText: fetchText as never };
    const first = await fetchFunvisisEarthquakes({}, shared);
    const second = await fetchFunvisisEarthquakes({}, shared);
    expect(first.source).toBe('live');
    expect(second.source).toBe('cache');
  });

  it('returns empty (source=empty) when the catalog fetch fails with no cache', async () => {
    const fetchText = vi.fn().mockRejectedValue(new Error('funvisis-catalog down'));
    const result = await fetchFunvisisEarthquakes({}, deps(fetchText));
    expect(result.source).toBe('empty');
    expect(result.collection).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('never throws on upstream failure', async () => {
    const fetchText = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(fetchFunvisisEarthquakes({}, deps(fetchText))).resolves.toBeDefined();
  });
});
