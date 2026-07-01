import type {
  EarthquakeFeature,
  EarthquakeFeatureCollection,
} from '@georesponde/shared';

/**
 * Raw SismosVE `/api/sismos` shapes — only the fields we consume are typed, and
 * everything is optional/defensive because SismosVE is an untrusted third-party
 * source: a malformed response must never crash the gateway. SismosVE federates
 * official FUNVISIS data as a GeoJSON-style feed.
 */
export interface SismosVeRawFeature {
  id?: string | number;
  geometry?: {
    type?: string;
    /** Point coordinates: [lng, lat]. */
    coordinates?: unknown;
  } | null;
  properties?: {
    /** Magnitude. */
    value?: number | null;
    depth?: number | null;
    /** Human place description. */
    addressFormatted?: string | null;
    /** Local date, e.g. "2026-06-30". */
    date?: string | null;
    /** Local time, e.g. "14:32:10". */
    time?: string | null;
    country?: string | null;
    url?: string | null;
  } | null;
}

export interface SismosVeResponse {
  type?: string;
  /** GeoJSON-style feed. */
  features?: SismosVeRawFeature[];
  /** Some SismosVE shapes nest under `sismos` instead of `features`. */
  sismos?: SismosVeRawFeature[];
}

/** Attribution label REQUIRED on FUNVISIS data federated through SismosVE. */
export const FUNVISIS_ATTRIBUTION = 'FUNVISIS (vía SismosVE)';

/** True when a value is a finite number within valid lat/lng bounds. */
function inRange(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/** Non-empty trimmed string, or undefined. */
function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Combine SismosVE `date` + `time` into an epoch (ms), or null when unparseable.
 * Tries `${date}T${time}` first (ISO-ish), then the date alone.
 */
function toEpoch(date?: string | null, time?: string | null): number | null {
  const d = str(date);
  if (!d) return null;
  const t = str(time);
  const candidates = t ? [`${d}T${t}`, `${d} ${t}`, d] : [d];
  for (const c of candidates) {
    const epoch = Date.parse(c);
    if (Number.isFinite(epoch)) return epoch;
  }
  return null;
}

/**
 * Normalize one raw SismosVE feature into a GeoJSON Point Feature, or undefined
 * when it is unusable (missing/out-of-range coordinates). Pure and defensive —
 * never throws. Only `http(s)` urls survive (blocks `javascript:` and friends).
 */
function toFeature(raw: SismosVeRawFeature): EarthquakeFeature | undefined {
  const coords = raw.geometry?.coordinates;
  if (!Array.isArray(coords)) return undefined;

  const lng = typeof coords[0] === 'number' ? coords[0] : NaN;
  const lat = typeof coords[1] === 'number' ? coords[1] : NaN;
  if (!inRange(lng, lat)) return undefined;

  const p = raw.properties ?? {};
  const depth = typeof p.depth === 'number' ? p.depth : undefined;
  const url = str(p.url);
  const safeUrl = url && /^https?:\/\//i.test(url) ? url : undefined;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: raw.id != null ? String(raw.id) : '',
      mag: typeof p.value === 'number' ? p.value : null,
      place: str(p.addressFormatted) ?? '',
      time: toEpoch(p.date, p.time),
      ...(depth !== undefined ? { depth } : {}),
      ...(safeUrl ? { url: safeUrl } : {}),
      source: FUNVISIS_ATTRIBUTION,
    },
  };
}

/**
 * Transform a raw SismosVE response into a normalized GeoJSON FeatureCollection:
 * one Point Feature per usable event, dropping any event without readable
 * coordinates. Accepts either `features` or `sismos` arrays. Never throws.
 */
export function toEarthquakeCollection(
  raw: SismosVeResponse | unknown,
): EarthquakeFeatureCollection {
  const obj = raw && typeof raw === 'object' ? (raw as SismosVeResponse) : undefined;
  const list = Array.isArray(obj?.features)
    ? obj!.features
    : Array.isArray(obj?.sismos)
      ? obj!.sismos
      : [];

  const features = list
    .map(toFeature)
    .filter((f): f is EarthquakeFeature => f !== undefined);

  return { type: 'FeatureCollection', features };
}
