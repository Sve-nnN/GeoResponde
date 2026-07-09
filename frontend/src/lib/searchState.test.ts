import { describe, it, expect } from 'vitest';
import { shouldShowNoResults } from './searchState';

const base = { loading: false, hasSearched: true, searchFailed: false, resultCount: 0 };

describe('shouldShowNoResults', () => {
  it('shows the empty state after a successful search with zero results', () => {
    expect(shouldShowNoResults(base)).toBe(true);
  });

  it('does NOT show the empty state when the search failed (#57)', () => {
    expect(shouldShowNoResults({ ...base, searchFailed: true })).toBe(false);
  });

  it('does not show the empty state while loading', () => {
    expect(shouldShowNoResults({ ...base, loading: true })).toBe(false);
  });

  it('does not show the empty state before any search', () => {
    expect(shouldShowNoResults({ ...base, hasSearched: false })).toBe(false);
  });

  it('does not show the empty state when there are results', () => {
    expect(shouldShowNoResults({ ...base, resultCount: 5 })).toBe(false);
  });

  it('a failed search that still holds previous results shows neither empty state', () => {
    expect(shouldShowNoResults({ ...base, searchFailed: true, resultCount: 3 })).toBe(false);
  });
});
