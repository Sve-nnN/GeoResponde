/**
 * Negentropy Technologies scientific provider (issue #83). Negentropy exposes
 * ~20 endpoints; only three are federated here — `hospitales`, `planteles`,
 * and `edificaciones` — chosen because they have no existing GeoResponde
 * equivalent (or a materially richer one). Explicitly excluded, per the
 * issue's own non-goals: `edificaciones_nasa` (re-serves the same NASA ARIA
 * DPM product already consumed directly), `movimiento_suelo` (matches
 * Copernicus EMS ground-movement's own methodology), and
 * `edificaciones_microsoft` (a different damage-probability source, deferred
 * to avoid a third overlapping "probability of damage" layer on one map).
 *
 * Response shapes are already well-formed GeoJSON (confirmed live against
 * the API), so this is a validating pass-through: only `Point` features with
 * in-range coordinates survive, and everything else is dropped defensively
 * (untrusted third-party data, same discipline as every other adapter).
 */

/** A Negentropy FeatureCollection. Deliberately LOOSE — each dataset has its
 * own property shape (hospital fields differ from school fields differ from
 * verified-damage fields), so properties pass through as an opaque bag
 * rather than a fixed shared type. Mirrors DamageFeatureCollection. */
export interface NegentropyFeatureCollection {
  type: 'FeatureCollection';
  features: unknown[];
}

interface RawFeature {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}

interface RawResponse {
  type?: string;
  features?: RawFeature[];
}

/** True when a value is a finite number within valid lat/lng bounds. */
function inRangePoint(coords: unknown): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Normalize one dataset's raw GeoJSON response into a validated
 * FeatureCollection, tagging every feature with the required Negentropy
 * attribution. Drops any feature that isn't a Point with in-range
 * coordinates. Never throws — malformed/unexpected input yields an empty
 * collection.
 */
export function toNegentropyCollection(raw: unknown): NegentropyFeatureCollection {
  const obj = raw && typeof raw === 'object' ? (raw as RawResponse) : undefined;
  const list = Array.isArray(obj?.features) ? obj!.features : [];

  const features = list
    .filter((f) => f?.geometry?.type === 'Point' && inRangePoint(f.geometry?.coordinates))
    .map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: f.geometry!.coordinates },
      properties: {
        ...(f.properties ?? {}),
        source: NEGENTROPY_ATTRIBUTION,
      },
    }));

  return { type: 'FeatureCollection', features };
}

/** Attribution REQUIRED on every Negentropy-hosted feature (issue #83). */
export const NEGENTROPY_ATTRIBUTION = 'Negentropy Technologies';
