import { BaseAdapter } from '../BaseAdapter.js';
import { HumanitarianProvider, NormalizedSearchResult, SubmissionPackage } from '@georesponde/shared';
import { fetchJson } from '../../transports/rest/client.js';
import { parseTerremotoVenezuelaResponse } from './parser.js';

const SUPABASE_URL = 'https://jckifxsdlnsvbztxydes.supabase.co/rest/v1/buildings';
// Publishable (anon) key embedded in the site's public bundle. Read-only usage.
const ANON_KEY = 'sb_publishable_i7iEDrCVZcSt0k3RGFrY4g_WrtZBB4w';

/**
 * Adapter for terremotovenezuela.com ("Mapa de Daños Venezuela"), a curated
 * registry of earthquake-damaged buildings backed by Supabase. Federates the
 * public `buildings` table read-only via PostgREST — no scraping.
 *
 * Ethics: this source also stores names of trapped/missing people
 * (`trapped_names`). Those are never requested or surfaced; only the
 * `has_missing_persons` flag is exposed.
 */
export class TerremotoVenezuelaAdapter implements BaseAdapter {
  provider: HumanitarianProvider;

  constructor(providerConfig: HumanitarianProvider) {
    this.provider = providerConfig;
  }

  private buildUrl(query: string): string {
    const url = new URL(SUPABASE_URL);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'last_updated_at.desc');
    url.searchParams.set('limit', '20');
    const q = query.trim();
    if (q) {
      const like = `*${q}*`;
      url.searchParams.set('or', `(name.ilike.${like},city.ilike.${like},zone.ilike.${like})`);
    }
    return url.toString();
  }

  async search(query: string): Promise<NormalizedSearchResult[]> {
    try {
      const rows = await fetchJson<unknown>(this.buildUrl(query), {
        timeoutMs: 10000,
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      });
      return parseTerremotoVenezuelaResponse(rows);
    } catch (error) {
      console.error('[TerremotoVenezuelaAdapter] Search failed:', error);
      return [];
    }
  }

  async submit(_pkg: SubmissionPackage): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
