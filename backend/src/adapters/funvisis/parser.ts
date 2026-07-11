import type {
  EarthquakeFeature,
  EarthquakeFeatureCollection,
} from '@georesponde/shared';

/**
 * Attribution REQUIRED on FUNVISIS data federated through the funvisis-catalog
 * CSV (issue #76). The catalog blends two source regimes — ISC Bulletin
 * (agency `FUNV`, ~2003-2025-03) and OCR'd official FUNVISIS bulletin images
 * (author `FUNVISIS`, 2025-03-present) — both FUNVISIS-origin, one label.
 */
export const FUNVISIS_ATTRIBUTION = 'FUNVISIS (via funvisis-catalog/ISC)';

/** The funvisis-catalog CSV's fixed column order. */
const CSV_COLUMNS = [
  'id',
  'time',
  'latitude',
  'longitude',
  'depth_km',
  'magnitude',
  'mag_type',
  'place',
  'author',
  'event_type',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

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
function str(value: string | undefined): string | undefined {
  return value !== undefined && value.trim().length > 0 ? value.trim() : undefined;
}

function toNum(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = parseFloat(value.trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Split the funvisis-catalog CSV into rows. The upstream is a well-formed,
 * machine-generated CSV (no embedded newlines in fields), so a plain
 * line-split is sufficient — this is not a general-purpose CSV parser. A
 * handful of `place` values contain a literal comma; rows with more than the
 * expected column count are defensively dropped rather than guessed at, per
 * FUNVISIS-03 (malformed rows never crash the service or corrupt a mapping).
 */
function parseRows(csv: string): CsvRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const idxByCol = new Map(CSV_COLUMNS.map((c) => [c, header.indexOf(c)]));
  if ([...idxByCol.values()].some((i) => i === -1)) return []; // unexpected schema

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    if (cells.length !== header.length) continue; // malformed row — drop, never guess
    const row = {} as CsvRow;
    for (const col of CSV_COLUMNS) {
      row[col] = cells[idxByCol.get(col)!] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Normalize one CSV row into a GeoJSON Point Feature, or undefined when it's
 * unusable (missing/out-of-range coordinates). Pure and defensive — never
 * throws. `time` is already ISO-8601 UTC in this source, unlike SismosVE's
 * local-time strings, so no timezone handling is needed here.
 */
function toFeature(row: CsvRow): EarthquakeFeature | undefined {
  const lng = toNum(row.longitude);
  const lat = toNum(row.latitude);
  if (lng === null || lat === null || !inRange(lng, lat)) return undefined;

  const timeStr = str(row.time);
  const epoch = timeStr ? Date.parse(timeStr) : NaN;
  const depth = toNum(row.depth_km);

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: str(row.id) ?? '',
      mag: toNum(row.magnitude),
      place: str(row.place) ?? '',
      time: Number.isFinite(epoch) ? epoch : null,
      ...(depth !== null ? { depth } : {}),
      source: FUNVISIS_ATTRIBUTION,
    },
  };
}

/**
 * Transform the raw funvisis-catalog CSV text into a normalized GeoJSON
 * FeatureCollection: one Point Feature per usable row, dropping any row
 * without readable coordinates or with an unexpected column count. Never
 * throws — a garbled or truncated CSV yields an empty collection rather than
 * crashing the gateway (FUNVISIS-03).
 */
export function toEarthquakeCollection(csv: string): EarthquakeFeatureCollection {
  if (typeof csv !== 'string' || csv.trim().length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  let rows: CsvRow[];
  try {
    rows = parseRows(csv);
  } catch {
    return { type: 'FeatureCollection', features: [] };
  }

  const features = rows
    .map(toFeature)
    .filter((f): f is EarthquakeFeature => f !== undefined);

  return { type: 'FeatureCollection', features };
}
