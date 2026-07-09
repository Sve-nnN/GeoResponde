/**
 * Frontend view of the per-topic submission capabilities served by
 * `GET /api/report/capabilities` (issue #42). Pure helpers so the Report page
 * can tell the user, before they submit, whether the selected report type can
 * actually reach any provider, and how (a live API or a provider handoff).
 */

export type SubmissionMode = 'api' | 'deep_link' | string;

export interface CapabilityProvider {
  id: string;
  name: string;
  mode: SubmissionMode;
}

/** Every report topic maps to the providers that can receive it (possibly none). */
export type CapabilitiesByTopic = Record<string, CapabilityProvider[]>;

/** Providers that can receive the given topic (empty when none / unknown). */
export function providersForTopic(
  capabilities: CapabilitiesByTopic | null,
  topic: string | null,
): CapabilityProvider[] {
  if (!capabilities || !topic) return [];
  return capabilities[topic] ?? [];
}

/** Whether a report of this topic can be delivered to at least one provider. */
export function isTopicDeliverable(
  capabilities: CapabilitiesByTopic | null,
  topic: string | null,
): boolean {
  return providersForTopic(capabilities, topic).length > 0;
}
