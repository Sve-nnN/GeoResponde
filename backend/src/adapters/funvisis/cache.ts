import type { EarthquakeFeatureCollection } from '@georesponde/shared';

interface CacheEntry {
  value: EarthquakeFeatureCollection;
  expires: number;
}

/**
 * Volatile, bounded, in-memory TTL cache for normalized FUNVISIS (via SismosVE)
 * earthquake responses. Mirrors the EONET/USGS caches: VOLATILE ONLY (never
 * persisted — GeoResponde is a federator, not a store). It shields the SismosVE
 * feed (~5 min refresh) and is bounded with oldest-key eviction.
 */
export class FunvisisCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes — matches SismosVE refresh
    this.maxEntries = options.maxEntries ?? 100;
  }

  /** Return the fresh (unexpired) value for a key, or undefined on miss/expiry. */
  get(key: string): EarthquakeFeatureCollection | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expires) return undefined;
    return entry.value;
  }

  /**
   * Return the last cached value regardless of TTL, for graceful degradation
   * when SismosVE is unreachable. Undefined only if never set.
   */
  getStale(key: string): EarthquakeFeatureCollection | undefined {
    return this.store.get(key)?.value;
  }

  /** Store a value with a fresh TTL, evicting the oldest key when full. */
  set(key: string, value: EarthquakeFeatureCollection): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });

    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
