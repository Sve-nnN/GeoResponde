import { describe, it, expect, beforeAll } from 'vitest';
import { REPORT_TOPICS, type ReportTopic } from '@georesponde/shared';
import { ProviderGateway } from '../ProviderGateway.js';
import { isSubmissionCapable, type BaseAdapter } from '../../adapters/BaseAdapter.js';

/**
 * Regression guard for issue #12: every report form must route through the
 * Submission Router. For EACH topic in REPORT_TOPICS there must be at least one
 * REGISTERED, active provider that is submission-capable AND whose
 * submissionTopics include that topic.
 *
 * Adapters are instantiated exactly the way the gateway does in production —
 * `ProviderGateway.initialize()` loads `public/catalog/providers.json` and builds
 * each adapter through the registry — so this test fails CI if a new topic is
 * added without wiring it to a submission-capable provider, or if a provider's
 * submissionTopics regress.
 */
describe('Submission Router topic coverage (#12)', () => {
  let adapters: BaseAdapter[];

  beforeAll(async () => {
    const gateway = new ProviderGateway();
    await gateway.initialize();
    const map = (gateway as unknown as { adapters: Map<string, BaseAdapter> }).adapters;
    adapters = [...map.values()];
  });

  it('boots at least one adapter from the catalog', () => {
    expect(adapters.length).toBeGreaterThan(0);
  });

  const topics = Object.keys(REPORT_TOPICS) as ReportTopic[];

  it.each(topics)('routes topic "%s" to a submission-capable provider', (topic) => {
    const accepting = adapters.filter(
      (a) => isSubmissionCapable(a) && a.submissionTopics!.includes(topic),
    );
    expect(
      accepting.length,
      `No submission-capable provider accepts topic "${topic}". Every REPORT_TOPICS ` +
        `entry must route to at least one provider — wire it into an adapter's ` +
        `submissionTopics (see docs/providers/submission-matrix.md).`,
    ).toBeGreaterThan(0);
  });

  it('covers every REPORT_TOPICS entry (no topic left unroutable)', () => {
    const covered = new Set<ReportTopic>();
    for (const a of adapters) {
      if (!isSubmissionCapable(a)) continue;
      for (const t of a.submissionTopics!) covered.add(t);
    }
    const uncovered = topics.filter((t) => !covered.has(t));
    expect(uncovered).toEqual([]);
  });
});
