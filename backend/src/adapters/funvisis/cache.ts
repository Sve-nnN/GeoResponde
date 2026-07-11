import type { EarthquakeFeatureCollection } from '@georesponde/shared';
import { VolatileTtlCache } from '../../transports/cache.js';

/**
 * Volatile, bounded, in-memory TTL cache for normalized FUNVISIS earthquake
 * responses (funvisis-catalog CSV, issue #76). Thin alias over the shared
 * {@link VolatileTtlCache}. The catalog is a ~2.2MB CSV refreshed on a
 * GitHub Actions schedule (not real-time), so a 1-hour default TTL is a
 * reasonable balance between freshness and not re-fetching the full file on
 * every request.
 */
export class FunvisisCache extends VolatileTtlCache<EarthquakeFeatureCollection> {
  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    super({ ttlMs: options.ttlMs ?? 60 * 60 * 1000, maxEntries: options.maxEntries });
  }
}
