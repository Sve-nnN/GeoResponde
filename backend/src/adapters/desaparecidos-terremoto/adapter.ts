import { BaseAdapter } from '../BaseAdapter.js';
import { HumanitarianProvider, NormalizedSearchResult, Report, SubmissionResult } from '@georesponde/shared';
import { fetchJson } from '../../transports/rest/client.js';
import { filterAndNormalizePlataformas } from './parser.js';

const PLATAFORMAS_ENDPOINT =
  'https://desaparecidos-terremoto-api.theempire.tech/api/plataformas';

/**
 * Federates the OPEN aid-platform directory (`/api/plataformas`) of
 * Desaparecidos Terremoto Venezuela. The people/missing-persons endpoint is
 * protected by reCAPTCHA v3 and cannot be federated server-to-server, so this
 * adapter only surfaces the directory of help platforms.
 */
export class DesaparecidosTerremotoAdapter implements BaseAdapter {
  provider: HumanitarianProvider;

  constructor(providerConfig: HumanitarianProvider) {
    this.provider = providerConfig;
  }

  async search(query: string): Promise<NormalizedSearchResult[]> {
    try {
      const items = await fetchJson<any[]>(PLATAFORMAS_ENDPOINT, { timeoutMs: 8000 });
      return filterAndNormalizePlataformas(items, query);
    } catch (error) {
      console.error('[DesaparecidosTerremotoAdapter] Search failed:', error);
      return [];
    }
  }

  async submit(_report: Report): Promise<SubmissionResult> {
    return { provider: this.provider.id, mode: 'dry-run', status: 'skipped' };
  }
}
