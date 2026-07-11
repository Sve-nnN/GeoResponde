import { fetchJson } from '../../transports/rest/client.js';
import { toNegentropyCollection, type NegentropyFeatureCollection } from './parser.js';
import { NegentropyCache } from './cache.js';

const API_BASE = 'https://api.negentropytechnologies.com/v1/terremoto';

/**
 * The three Negentropy datasets federated here (issue #83) — see parser.ts
 * for why the others (edificaciones_nasa, movimiento_suelo,
 * edificaciones_microsoft) are excluded.
 */
export const NEGENTROPY_DATASETS = ['hospitales', 'planteles', 'edificaciones'] as const;
export type NegentropyDataset = (typeof NEGENTROPY_DATASETS)[number];

export function isNegentropyDataset(value: string): value is NegentropyDataset {
  return (NEGENTROPY_DATASETS as readonly string[]).includes(value);
}

export interface NegentropyQueryParams {
  /** minx,miny,maxx,maxy in EPSG:4326, forwarded to the upstream bbox filter. */
  bbox?: string;
}

export type NegentropySource = 'live' | 'cache' | 'empty';

export interface NegentropyResult {
  collection: NegentropyFeatureCollection;
  source: NegentropySource;
}

export interface NegentropyDeps {
  cache: NegentropyCache;
  fetchJson: typeof fetchJson;
}

/** Module-level singleton cache — one shared upstream budget across clients. */
const defaultCache = new NegentropyCache();

function emptyCollection(): NegentropyFeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

/** bbox is valid only as exactly 4 comma-separated finite numbers. */
function validBbox(bbox: string): boolean {
  const parts = bbox.split(',');
  if (parts.length !== 4) return false;
  return parts.every((p) => p.trim() !== '' && Number.isFinite(Number(p)));
}

/**
 * Fetch a Negentropy layer (hospitales/planteles/edificaciones) through the
 * cache, normalizing to a validated GeoJSON FeatureCollection. Mirrors the
 * EONET/USGS services:
 *  - fresh cache hit within TTL -> `source: 'cache'`, no upstream fetch;
 *  - miss -> fetch, normalize, cache, `source: 'live'`;
 *  - fetch failure (down/timeout) -> stale cache (`'cache'`) if present,
 *    else an empty collection (`'empty'`). NEVER throws.
 * An invalid `bbox` is dropped rather than forwarded upstream (fails open to
 * "no filter", never sent as garbage). Attribution "Negentropy Technologies"
 * is carried on every feature.
 */
export async function fetchNegentropyLayer(
  dataset: NegentropyDataset,
  params: NegentropyQueryParams = {},
  deps: NegentropyDeps = { cache: defaultCache, fetchJson },
): Promise<NegentropyResult> {
  const bbox = params.bbox && validBbox(params.bbox) ? params.bbox : undefined;
  const key = `${dataset}:${bbox ?? 'all'}`;

  const fresh = deps.cache.get(key);
  if (fresh) return { collection: fresh, source: 'cache' };

  const url = bbox
    ? `${API_BASE}/${dataset}?bbox=${encodeURIComponent(bbox)}`
    : `${API_BASE}/${dataset}`;

  try {
    const raw = await deps.fetchJson<unknown>(url, { timeoutMs: 10000 });
    const collection = toNegentropyCollection(raw);
    deps.cache.set(key, collection);
    return { collection, source: 'live' };
  } catch (err) {
    console.error(
      `[negentropy] ${dataset} fetch failed, degrading gracefully: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    const stale = deps.cache.getStale(key);
    if (stale) return { collection: stale, source: 'cache' };
    return { collection: emptyCollection(), source: 'empty' };
  }
}
