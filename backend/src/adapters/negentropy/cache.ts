import { VolatileTtlCache } from '../../transports/cache.js';
import type { NegentropyFeatureCollection } from './parser.js';

/**
 * Volatile, bounded, in-memory TTL cache for normalized Negentropy layers
 * (issue #83). One cache instance shared across all three datasets
 * (hospitales/planteles/edificaciones), keyed per dataset+bbox. 1-hour TTL:
 * these are largely static reference/assessment datasets, not a live feed.
 */
export class NegentropyCache extends VolatileTtlCache<NegentropyFeatureCollection> {
  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    super({
      ttlMs: options.ttlMs ?? 60 * 60 * 1000,
      maxEntries: options.maxEntries ?? 32,
    });
  }
}
