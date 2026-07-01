import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

/** Degrade-safe source reported by the gateway `X-Damage-Source` header. */
export type NasaDpmSource = 'live' | 'cache' | 'empty' | null;

/**
 * Loose damage FeatureCollection — the DPM carries arbitrary polygon geometry,
 * so this is NOT the Point-only earthquake type. Features are opaque; the
 * existing MapLibre `step` paint reads `damage_probability` directly.
 */
export interface NasaDpmFeatureCollection {
  type: 'FeatureCollection';
  features: unknown[];
}

const EMPTY_DPM: NasaDpmFeatureCollection = { type: 'FeatureCollection', features: [] };

export interface UseNasaDpmLayerResult {
  collection: NasaDpmFeatureCollection;
  loading: boolean;
  error: string | null;
  source: NasaDpmSource;
  attribution: string | null;
  disclaimer: string | null;
}

function normalizeSource(header: string | null): NasaDpmSource {
  return header === 'live' || header === 'cache' || header === 'empty' ? header : null;
}

/**
 * Fetch the NASA ARIA "Likelihood of Damaged Structures" (DPM) layer from the
 * gateway `/api/damage/nasa/dpm` route (Phase 15, NASA-02). Mirrors
 * `useDamageLayer`: only fetches while `enabled` (the layer toggle) is on, aborts
 * in-flight requests on cleanup, and never throws — a failure sets `error` and
 * leaves an empty collection. Reads `X-Attribution`, `X-Damage-Disclaimer` and
 * `X-Damage-Source` so the legend can surface the mandatory ARIA/NASA/ESA/Overture
 * credit AND the "experimental, not validated" disclaimer (ND-06).
 *
 * Sends NO `?bbox` — the gateway scopes the query to the event's country by
 * default; the override stays dormant (ND-05).
 */
export function useNasaDpmLayer(enabled: boolean): UseNasaDpmLayerResult {
  const [collection, setCollection] = useState<NasaDpmFeatureCollection>(EMPTY_DPM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<NasaDpmSource>(null);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCollection(EMPTY_DPM);
      setSource(null);
      setError(null);
      setAttribution(null);
      setDisclaimer(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/damage/nasa/dpm`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        setCollection(
          body && body.type === 'FeatureCollection' && Array.isArray(body.features)
            ? (body as NasaDpmFeatureCollection)
            : EMPTY_DPM,
        );
        setSource(normalizeSource(res.headers.get('X-Damage-Source')));
        setAttribution(res.headers.get('X-Attribution'));
        setDisclaimer(res.headers.get('X-Damage-Disclaimer'));
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setCollection(EMPTY_DPM);
        setSource(null);
        setAttribution(null);
        setDisclaimer(null);
        setError(err instanceof Error ? err.message : 'Failed to load NASA DPM layer');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return { collection, loading, error, source, attribution, disclaimer };
}
