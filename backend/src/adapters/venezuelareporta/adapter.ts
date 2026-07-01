import { BaseAdapter } from '../BaseAdapter.js';
import { HumanitarianProvider, NormalizedSearchResult, SubmissionPackage } from '@georesponde/shared';
import { fetchJson } from '../../transports/rest/client.js';
import { parseVenezuelaReportaResponse, VenezuelaReportaResponse } from './parser.js';

const API_BASE = 'https://venezuelareporta.org/api/v1/personas';

/**
 * Adapter for the Venezuela Reporta open API. It performs a single JSON request
 * against the official `/api/v1/personas` endpoint per search and normalizes the
 * results. Attribution ("Venezuela Reporta") is preserved via the `provider`
 * field on every result, as required by the API terms.
 */
export class VenezuelaReportaAdapter implements BaseAdapter {
  provider: HumanitarianProvider;

  constructor(providerConfig: HumanitarianProvider) {
    this.provider = providerConfig;
  }

  async search(query: string): Promise<NormalizedSearchResult[]> {
    try {
      console.log(`[VenezuelaReportaAdapter] Fetching data for query: "${query}"`);

      const url = `${API_BASE}?q=${encodeURIComponent(query)}&limit=10`;
      const response = await fetchJson<VenezuelaReportaResponse>(url, { timeoutMs: 10000 });

      const normalizedResults = parseVenezuelaReportaResponse(response);

      console.log(`[VenezuelaReportaAdapter] Extracted ${normalizedResults.length} normalized results for query: "${query}"`);

      return normalizedResults;
    } catch (error) {
      console.error('[VenezuelaReportaAdapter] Search failed:', error);
      return [];
    }
  }

  async submit(pkg: SubmissionPackage): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
