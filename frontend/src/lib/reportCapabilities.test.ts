import { describe, it, expect } from 'vitest';
import { providersForTopic, isTopicDeliverable, type CapabilitiesByTopic } from './reportCapabilities';

const caps: CapabilitiesByTopic = {
  'missing-person': [
    { id: 'prov-a', name: 'A', mode: 'api' },
    { id: 'prov-b', name: 'B', mode: 'deep_link' },
  ],
  'building-damage': [{ id: 'prov-c', name: 'C', mode: 'api' }],
  'shelter-status': [],
  'resource-need': [],
};

describe('reportCapabilities helpers', () => {
  it('returns the providers for a covered topic', () => {
    expect(providersForTopic(caps, 'missing-person').map((p) => p.id)).toEqual(['prov-a', 'prov-b']);
  });

  it('returns an empty array for an uncovered topic', () => {
    expect(providersForTopic(caps, 'shelter-status')).toEqual([]);
  });

  it('returns an empty array when capabilities are not loaded yet', () => {
    expect(providersForTopic(null, 'missing-person')).toEqual([]);
  });

  it('returns an empty array when no topic is selected', () => {
    expect(providersForTopic(caps, null)).toEqual([]);
  });

  it('returns an empty array for an unknown topic', () => {
    expect(providersForTopic(caps, 'does-not-exist')).toEqual([]);
  });

  it('reports a covered topic as deliverable', () => {
    expect(isTopicDeliverable(caps, 'missing-person')).toBe(true);
    expect(isTopicDeliverable(caps, 'building-damage')).toBe(true);
  });

  it('reports an uncovered or unknown topic as not deliverable', () => {
    expect(isTopicDeliverable(caps, 'shelter-status')).toBe(false);
    expect(isTopicDeliverable(caps, 'resource-need')).toBe(false);
    expect(isTopicDeliverable(null, 'missing-person')).toBe(false);
  });
});
