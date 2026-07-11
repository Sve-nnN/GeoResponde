import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fetchNegentropyLayer, isNegentropyDataset, NEGENTROPY_DATASETS } from '../service.js';
import { NegentropyCache } from '../cache.js';

const hospitales = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/hospitales.json'), 'utf8'),
);

function deps(fetchImpl: ReturnType<typeof vi.fn>) {
  return { cache: new NegentropyCache(), fetchJson: fetchImpl as never };
}

describe('isNegentropyDataset', () => {
  it('accepts the three scoped datasets and rejects everything else', () => {
    for (const d of NEGENTROPY_DATASETS) expect(isNegentropyDataset(d)).toBe(true);
    expect(isNegentropyDataset('edificaciones_nasa')).toBe(false);
    expect(isNegentropyDataset('movimiento_suelo')).toBe(false);
    expect(isNegentropyDataset('edificaciones_microsoft')).toBe(false);
    expect(isNegentropyDataset('')).toBe(false);
  });
});

describe('fetchNegentropyLayer — live path', () => {
  it('normalizes the fixture and reports source=live', async () => {
    const fetchJson = vi.fn().mockResolvedValue(hospitales);
    const result = await fetchNegentropyLayer('hospitales', {}, deps(fetchJson));
    expect(result.source).toBe('live');
    expect(result.collection.features).toHaveLength(1);
    expect(fetchJson.mock.calls[0][0]).toContain('/hospitales');
    expect(fetchJson.mock.calls[0][0]).not.toContain('bbox');
  });

  it('forwards a valid bbox and drops an invalid one', async () => {
    const fetchJson = vi.fn().mockResolvedValue(hospitales);
    await fetchNegentropyLayer('planteles', { bbox: '-68,10,-67,11' }, deps(fetchJson));
    expect(fetchJson.mock.calls[0][0]).toContain('bbox=-68%2C10%2C-67%2C11');

    const fetchJson2 = vi.fn().mockResolvedValue(hospitales);
    await fetchNegentropyLayer('planteles', { bbox: 'not-a-bbox' }, deps(fetchJson2));
    expect(fetchJson2.mock.calls[0][0]).not.toContain('bbox');
  });

  it('caches per dataset+bbox so different datasets never share a fetch', async () => {
    const fetchJson = vi.fn().mockResolvedValue(hospitales);
    const shared = deps(fetchJson);
    await fetchNegentropyLayer('hospitales', {}, shared);
    const second = await fetchNegentropyLayer('planteles', {}, shared);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(second.source).toBe('live');
  });
});

describe('fetchNegentropyLayer — graceful degradation', () => {
  it('degrades to stale cache after a prior success', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce(hospitales)
      .mockRejectedValueOnce(new Error('Negentropy down'));
    const shared = { cache: new NegentropyCache({ ttlMs: -1 }), fetchJson: fetchJson as never };
    const first = await fetchNegentropyLayer('hospitales', {}, shared);
    const second = await fetchNegentropyLayer('hospitales', {}, shared);
    expect(first.source).toBe('live');
    expect(second.source).toBe('cache');
  });

  it('returns empty (source=empty) when the fetch fails with no cache', async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error('Negentropy down'));
    const result = await fetchNegentropyLayer('edificaciones', {}, deps(fetchJson));
    expect(result.source).toBe('empty');
    expect(result.collection).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('never throws on upstream failure', async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(fetchNegentropyLayer('hospitales', {}, deps(fetchJson))).resolves.toBeDefined();
  });
});
