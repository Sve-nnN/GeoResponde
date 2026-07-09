import { describe, it, expect } from 'vitest';
import { NormalizedSearchResult } from '@georesponde/shared';
import { rankResults, scoreResult } from '../ranking.js';

function makeResult(over: Partial<NormalizedSearchResult> = {}): NormalizedSearchResult {
  return {
    provider: 'Test Provider',
    provider_id: 'prov-test',
    type: 'person',
    title: 'Unknown',
    url: 'https://example.com/r',
    ...over,
  };
}

const order = (results: NormalizedSearchResult[]) => results.map((r) => r.title);

describe('rankResults', () => {
  it('returns an empty array for empty input', () => {
    expect(rankResults([], 'maria perez')).toEqual([]);
  });

  it('ranks an exact title match above a partial one', () => {
    const exact = makeResult({ title: 'Maria Perez' });
    const partial = makeResult({ title: 'Maria Gonzalez' });
    expect(order(rankResults([partial, exact], 'Maria Perez'))).toEqual([
      'Maria Perez',
      'Maria Gonzalez',
    ]);
  });

  it('is accent and case insensitive on the query match', () => {
    const a = makeResult({ title: 'MARÍA PÉREZ' });
    const b = makeResult({ title: 'Jose Ramirez' });
    expect(order(rankResults([b, a], 'maria perez'))).toEqual(['MARÍA PÉREZ', 'Jose Ramirez']);
  });

  it('ranks all-token matches above single-token matches', () => {
    const all = makeResult({ title: 'Ana Maria Suarez' }); // both tokens
    const one = makeResult({ title: 'Ana Gomez' }); // one token
    expect(order(rankResults([one, all], 'ana maria'))).toEqual([
      'Ana Maria Suarez',
      'Ana Gomez',
    ]);
  });

  it('breaks equal query matches by corroboration (more sources wins)', () => {
    const solo = makeResult({ title: 'Maria Perez', provider_id: 'a' });
    const corroborated = makeResult({
      title: 'Maria Perez',
      provider_id: 'b',
      sources: [
        { provider: 'X', url: 'u1' },
        { provider: 'Y', url: 'u2' },
      ],
    });
    expect(order(rankResults([solo, corroborated], 'Maria Perez'))[0]).toBe('Maria Perez');
    // The corroborated one must come first; disambiguate by provider_id.
    const ranked = rankResults([solo, corroborated], 'Maria Perez');
    expect(ranked[0].provider_id).toBe('b');
  });

  it('a full query match outranks corroboration (priority order)', () => {
    const matchOnly = makeResult({ title: 'Maria Perez', provider_id: 'match' });
    const corroboratedNoMatch = makeResult({
      title: 'Someone Else',
      provider_id: 'corr',
      sources: Array.from({ length: 5 }, (_, i) => ({ provider: `P${i}`, url: `u${i}` })),
    });
    const ranked = rankResults([corroboratedNoMatch, matchOnly], 'Maria Perez');
    expect(ranked[0].provider_id).toBe('match');
  });

  it('gives structured data (cedula/age/coords) a bonus over a bare record', () => {
    const bare = makeResult({ title: 'Maria Perez', provider_id: 'bare' });
    const structured = makeResult({
      title: 'Maria Perez',
      provider_id: 'struct',
      person: { fullName: 'Maria Perez', cedula: '12345678', age: 30 },
      location: [-66.9, 10.5],
    });
    expect(rankResults([bare, structured], 'Maria Perez')[0].provider_id).toBe('struct');
  });

  it('uses provider confidence as a lower-priority signal', () => {
    const low = makeResult({ title: 'Maria Perez', provider_id: 'low', confidence: 0.1 });
    const high = makeResult({ title: 'Maria Perez', provider_id: 'high', confidence: 0.9 });
    expect(rankResults([low, high], 'Maria Perez')[0].provider_id).toBe('high');
  });

  it('breaks a full tie by recency (newer last_update first)', () => {
    const older = makeResult({
      title: 'Maria Perez',
      provider_id: 'old',
      last_update: '2026-01-01T00:00:00Z',
    });
    const newer = makeResult({
      title: 'Maria Perez',
      provider_id: 'new',
      last_update: '2026-07-01T00:00:00Z',
    });
    expect(rankResults([older, newer], 'Maria Perez')[0].provider_id).toBe('new');
  });

  it('is a stable sort when everything ties', () => {
    const a = makeResult({ title: 'Same', provider_id: 'a' });
    const b = makeResult({ title: 'Same', provider_id: 'b' });
    const c = makeResult({ title: 'Same', provider_id: 'c' });
    expect(rankResults([a, b, c], 'nomatch').map((r) => r.provider_id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = [
      makeResult({ title: 'Maria Gonzalez' }),
      makeResult({ title: 'Maria Perez' }),
    ];
    const snapshot = order(input);
    rankResults(input, 'Maria Perez');
    expect(order(input)).toEqual(snapshot);
  });

  it('scoreResult is zero when the query does not match and no other signals exist', () => {
    const r = makeResult({ title: 'Totally Different' });
    expect(scoreResult(r, ['maria', 'perez'], 'maria perez')).toBe(0);
  });
});
