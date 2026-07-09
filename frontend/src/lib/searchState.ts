/**
 * UI state helpers for the Find search results area (issue #57).
 *
 * The "No results found" message must only appear after a search that actually
 * completed and returned zero matches. A failed request (backend down, network
 * error, non-OK response) is NOT a zero-result search, so the message must stay
 * hidden in that case, otherwise the UI implies the search succeeded with no
 * matches while an error dialog says the opposite.
 */
export interface SearchResultsState {
  /** A request is currently in flight. */
  loading: boolean;
  /** At least one search has been attempted this session. */
  hasSearched: boolean;
  /** The most recent search attempt failed (network / backend / non-OK). */
  searchFailed: boolean;
  /** Number of results currently held. */
  resultCount: number;
}

/**
 * Whether to show the "No results found" empty state. True only for a
 * successful search that returned zero results.
 */
export function shouldShowNoResults(state: SearchResultsState): boolean {
  return (
    !state.loading &&
    state.hasSearched &&
    !state.searchFailed &&
    state.resultCount === 0
  );
}
