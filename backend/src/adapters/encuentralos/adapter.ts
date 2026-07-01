import { BaseAdapter } from '../BaseAdapter.js';
import { HumanitarianProvider, NormalizedSearchResult, SubmissionPackage } from '@georesponde/shared';
import { fetchJson } from '../../transports/rest/client.js';
import { parseEncuentralosResponse, EncuentralosResponse } from './parser.js';

const API_BASE = 'https://encuentralos.tecnosoft.dev/api/personas';

export class EncuentralosAdapter implements BaseAdapter {
  provider: HumanitarianProvider;

  constructor(providerConfig: HumanitarianProvider) {
    this.provider = providerConfig;
  }

  async search(query: string): Promise<NormalizedSearchResult[]> {
    try {
      console.log(`[EncuentralosAdapter] Fetching data for query: "${query}"`);

      const url = `${API_BASE}?q=${encodeURIComponent(query)}&limit=10`;
      const response = await fetchJson<EncuentralosResponse>(url, { timeoutMs: 10000 });

      const normalizedResults = parseEncuentralosResponse(response);

      console.log(
        `[EncuentralosAdapter] Extracted ${normalizedResults.length} normalized results for query: "${query}"`,
      );

      return normalizedResults;
    } catch (error) {
      console.error('[EncuentralosAdapter] Search failed:', error);
      return [];
    }
  }

  async submit(_pkg: SubmissionPackage): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
