import type { EarthquakeFeatureCollection } from '@georesponde/shared';
import { fetchText } from '../../transports/rest/client.js';
import { toEarthquakeCollection } from './parser.js';
import { FunvisisCache } from './cache.js';

/**
 * funvisis-catalog (issue #76): a community-maintained CSV sourced from the
 * ISC Bulletin (agency FUNV, ~2003-2025-03) and OCR'd official FUNVISIS
 * bulletin images (2025-03-present), refreshed on a GitHub Actions schedule.
 * Chosen over SismosVE/maravilla.json (confirmed live to return only the ~20
 * most-recent events) per the issue's preferred integration order — real
 * historical depth without GeoResponde maintaining its own database.
 * https://github.com/kyleedwardbradley/funvisis-catalog
 */
const FUNVISIS_CATALOG_URL =
  'https://raw.githubusercontent.com/kyleedwardbradley/funvisis-catalog/main/funvisis_catalog.csv';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface FunvisisQueryParams {
  /** Earliest event date as YYYY-MM-DD (the timeline preset window). */
  start?: string;
}

export type FunvisisSource = 'live' | 'cache' | 'empty';

export interface FunvisisResult {
  collection: EarthquakeFeatureCollection;
  source: FunvisisSource;
}

export interface FunvisisDeps {
  cache: FunvisisCache;
  fetchText: typeof fetchText;
}

/** Module-level singleton cache — one shared upstream budget across clients. */
const defaultCache = new FunvisisCache();

function emptyCollection(): EarthquakeFeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

/**
 * Filter a normalized collection down to events at/after `start`. The catalog
 * has no server-side date filter (it's a static CSV file), so the timeline
 * window is applied here. Features with a null time are kept (we cannot prove
 * they are outside the window).
 */
function filterByStart(
  collection: EarthquakeFeatureCollection,
  start?: string,
): EarthquakeFeatureCollection {
  if (!start || !DATE_RE.test(start)) return collection;
  const cutoff = Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(cutoff)) return collection;
  return {
    type: 'FeatureCollection',
    features: collection.features.filter(
      (f) => f.properties.time === null || f.properties.time >= cutoff,
    ),
  };
}

/**
 * Fetch FUNVISIS earthquakes (via the funvisis-catalog CSV) through the
 * cache, normalizing to a GeoJSON FeatureCollection. Behavior mirrors the
 * USGS/EONET services:
 *  - fresh cache hit within TTL -> `source: 'cache'`, no upstream fetch;
 *  - miss -> fetch, normalize, cache, `source: 'live'`;
 *  - fetch failure (down/timeout) -> stale cache (`'cache'`) if present, else
 *    an empty collection (`'empty'`). NEVER throws.
 * The full ~22k-row CSV is fetched and cached once; the `start` window is
 * applied to the served result so different windows share one upstream
 * fetch. Attribution "FUNVISIS (via funvisis-catalog/ISC)" is carried on
 * every feature.
 */
export async function fetchFunvisisEarthquakes(
  params: FunvisisQueryParams = {},
  deps: FunvisisDeps = { cache: defaultCache, fetchText },
): Promise<FunvisisResult> {
  const key = 'all';

  const fresh = deps.cache.get(key);
  if (fresh) return { collection: filterByStart(fresh, params.start), source: 'cache' };

  try {
    const csv = await deps.fetchText(FUNVISIS_CATALOG_URL, { timeoutMs: 15000 });
    const collection = toEarthquakeCollection(csv);
    deps.cache.set(key, collection);
    return { collection: filterByStart(collection, params.start), source: 'live' };
  } catch (err) {
    console.error(
      `[funvisis] funvisis-catalog fetch failed, degrading gracefully: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    const stale = deps.cache.getStale(key);
    if (stale) return { collection: filterByStart(stale, params.start), source: 'cache' };
    return { collection: emptyCollection(), source: 'empty' };
  }
}
