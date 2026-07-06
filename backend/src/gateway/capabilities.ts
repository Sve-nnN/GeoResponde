import { REPORT_TOPICS, type ReportTopic, type SubmissionMode } from '@georesponde/shared';
import { BaseAdapter, isSubmissionCapable } from '../adapters/BaseAdapter.js';

/** One provider that can receive a report for a given topic. */
export interface ProviderSubmissionCapability {
  id: string;
  name: string;
  /** How the submission reaches the provider: a live API or a user deep link. */
  mode: SubmissionMode;
}

/** Which providers can receive each report topic. Every topic key is present. */
export type CapabilitiesByTopic = Record<ReportTopic, ProviderSubmissionCapability[]>;

/**
 * Compute, per report topic, the providers that can actually receive it (#42).
 *
 * A provider counts only when it is submission-capable (advertises `submission`
 * and declares `submissionTopics`, per {@link isSubmissionCapable}) and its
 * topics include the topic. Every `REPORT_TOPICS` key is present in the result,
 * mapping to an empty array when no provider covers it, so the frontend can tell
 * "no provider for this topic yet" apart from "topic does not exist".
 *
 * Pure: derived only from the adapters passed in, no I/O.
 */
export function submissionCapabilities(adapters: BaseAdapter[]): CapabilitiesByTopic {
  const byTopic = {} as CapabilitiesByTopic;
  for (const topic of Object.keys(REPORT_TOPICS) as ReportTopic[]) {
    byTopic[topic] = [];
  }

  for (const adapter of adapters) {
    if (!isSubmissionCapable(adapter)) continue;
    for (const topic of adapter.submissionTopics!) {
      byTopic[topic].push({
        id: adapter.provider.id,
        name: adapter.provider.display_name,
        mode: adapter.submissionMode ?? 'api',
      });
    }
  }

  return byTopic;
}
