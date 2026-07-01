import { NormalizedSearchResult } from '@georesponde/shared';

/**
 * Subset of a row from the `buildings` table exposed by terremotovenezuela.com
 * (Supabase PostgREST). Only the fields we consume are typed.
 *
 * NOTE: the source also carries `trapped_names` / `casualties_notes` (free-text
 * names of trapped/missing people). Those are intentionally NOT read here and
 * never surfaced in a result — we only expose the `has_missing_persons` flag.
 */
export interface TerremotoVenezuelaBuilding {
  id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  zone?: string | null;
  lat?: number | null;
  lng?: number | null;
  damage_level?: string | null;
  status?: string | null;
  main_photo_url?: string | null;
  general_source?: string | null;
  has_missing_persons?: boolean;
  is_technically_evaluated?: boolean;
  last_updated_at?: string | null;
  created_at?: string | null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function normalizeBuilding(b: TerremotoVenezuelaBuilding): NormalizedSearchResult {
  const subtitle = [b.address, b.city, b.zone]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' · ');

  const hasCoords =
    isFiniteNumber(b.lat) &&
    isFiniteNumber(b.lng) &&
    Math.abs(b.lat) <= 90 &&
    Math.abs(b.lng) <= 180;

  return {
    provider: 'Terremoto Venezuela',
    provider_id: b.id,
    type: 'building',
    title: b.name?.trim() || 'Edificio sin nombre',
    subtitle: subtitle || undefined,
    status: b.damage_level ?? undefined,
    location: hasCoords ? [b.lng as number, b.lat as number] : undefined,
    last_update: b.last_updated_at ?? b.created_at ?? undefined,
    thumbnail: b.main_photo_url ?? undefined,
    // The site has no per-building detail route, so link to the site home.
    url: 'https://terremotovenezuela.com/',
    metadata: {
      damage_level: b.damage_level ?? null,
      review_status: b.status ?? null,
      has_missing_persons: Boolean(b.has_missing_persons),
      technically_evaluated: Boolean(b.is_technically_evaluated),
      source: b.general_source ?? null,
    },
  };
}

export function parseTerremotoVenezuelaResponse(rows: unknown): NormalizedSearchResult[] {
  if (!Array.isArray(rows)) return [];
  return (rows as TerremotoVenezuelaBuilding[]).map(normalizeBuilding);
}
