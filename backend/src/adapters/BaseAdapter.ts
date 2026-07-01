import { HumanitarianProvider, NormalizedSearchResult, Report, SubmissionResult } from '@georesponde/shared';

export interface BaseAdapter {
  provider: HumanitarianProvider;
  search(query: string, domain?: string): Promise<NormalizedSearchResult[]>;
  submit(report: Report): Promise<SubmissionResult>;
}
