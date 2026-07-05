import { describe, it, expect } from 'vitest';
import { HumanitarianProvider, REPORT_TOPICS, type ReportTopic } from '@georesponde/shared';
import { MockHumanitarianAdapter } from '../../testing/MockHumanitarianAdapter.js';
import { submissionCapabilities } from '../capabilities.js';

function provider(id: string, capabilities: string[]): HumanitarianProvider {
  return {
    id,
    display_name: id.replace('prov-', ''),
    capabilities,
  } as HumanitarianProvider;
}

const ALL_TOPICS = Object.keys(REPORT_TOPICS) as ReportTopic[];

describe('submissionCapabilities', () => {
  it('includes every report topic key, even with no adapters', () => {
    const caps = submissionCapabilities([]);
    expect(Object.keys(caps).sort()).toEqual([...ALL_TOPICS].sort());
    for (const topic of ALL_TOPICS) expect(caps[topic]).toEqual([]);
  });

  it('lists a submission-capable provider only under its declared topics', () => {
    const a = new MockHumanitarianAdapter(provider('prov-a', ['search', 'submission']), {
      submissionTopics: ['missing-person'],
      submissionMode: 'api',
    });
    const caps = submissionCapabilities([a]);
    expect(caps['missing-person']).toEqual([{ id: 'prov-a', name: 'a', mode: 'api' }]);
    expect(caps['shelter-status']).toEqual([]);
  });

  it('excludes a provider that does not advertise the submission capability', () => {
    const a = new MockHumanitarianAdapter(provider('prov-search-only', ['search']), {
      submissionTopics: ['missing-person'],
    });
    const caps = submissionCapabilities([a]);
    expect(caps['missing-person']).toEqual([]);
  });

  it('excludes a provider that advertises submission but declares no topics', () => {
    const a = new MockHumanitarianAdapter(provider('prov-b', ['submission']), {
      submissionTopics: [],
    });
    const caps = submissionCapabilities([a]);
    for (const topic of ALL_TOPICS) expect(caps[topic]).toEqual([]);
  });

  it('lists multiple providers for the same topic', () => {
    const a = new MockHumanitarianAdapter(provider('prov-a', ['submission']), {
      submissionTopics: ['missing-person'],
      submissionMode: 'api',
    });
    const b = new MockHumanitarianAdapter(provider('prov-b', ['submission']), {
      submissionTopics: ['missing-person'],
      submissionMode: 'deep_link',
    });
    const caps = submissionCapabilities([a, b]);
    expect(caps['missing-person'].map((p) => p.id).sort()).toEqual(['prov-a', 'prov-b']);
  });

  it('reflects the submission mode (api vs deep_link)', () => {
    const a = new MockHumanitarianAdapter(provider('prov-dl', ['submission']), {
      submissionTopics: ['missing-person'],
      submissionMode: 'deep_link',
    });
    expect(submissionCapabilities([a])['missing-person'][0].mode).toBe('deep_link');
  });
});
