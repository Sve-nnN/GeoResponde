import { HumanitarianProvider, NormalizedSearchResult, Report, SubmissionResult } from '@georesponde/shared';
import { BaseAdapter } from '../adapters/BaseAdapter.js';

export class MockHumanitarianAdapter implements BaseAdapter {
  provider: HumanitarianProvider;

  constructor(provider: HumanitarianProvider) {
    this.provider = provider;
  }

  async search(query: string, domain?: string): Promise<NormalizedSearchResult[]> {
    console.log(`[Mock] Searching provider ${this.provider.id} for "${query}"`);
    
    // Simulate latency
    await new Promise(r => setTimeout(r, Math.random() * 500 + 100));

    // Return fake results matching query
    if (query.length < 3) return [];

    return [
      {
        provider: this.provider.display_name,
        provider_id: this.provider.id,
        type: 'person',
        title: `Result for ${query}`,
        subtitle: 'Last seen nearby',
        url: `${this.provider.website}search?q=${encodeURIComponent(query)}`,
        last_update: new Date().toISOString()
      },
      {
        provider: this.provider.display_name,
        provider_id: this.provider.id,
        type: 'shelter',
        title: `Shelter related to ${query}`,
        subtitle: 'At 50% capacity',
        url: `${this.provider.website}shelters/1`,
        last_update: new Date().toISOString()
      }
    ];
  }

  async submit(report: Report): Promise<SubmissionResult> {
    // Never log report.fields — may carry sensitive PII (cédula, contact).
    console.log(`[Mock] Submitting ${report.topic} report to provider ${this.provider.id}`);
    return { provider: this.provider.id, mode: 'dry-run', status: 'skipped' };
  }
}
