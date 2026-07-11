/**
 * Generic REST/JSON transport. Performs a single GET request against a JSON API
 * with a hard timeout and returns the parsed body. Reusable by any adapter that
 * talks to an official JSON endpoint instead of scraping HTML.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  const { timeoutMs = 8000, headers = {} } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GeoResponde-Gateway/1.0',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`REST transport responded with status: ${res.status}`);
    }

    // Parse from text and strip a leading UTF-8 BOM, which some static JSON
    // feeds emit and which would otherwise make JSON.parse throw.
    const text = (await res.text()).replace(/^﻿/, '');
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generic REST/text transport. Same shape as {@link fetchJson} but returns the
 * raw response body instead of JSON-parsing it — for CSV/plain-text upstreams
 * (e.g. the funvisis-catalog CSV). Reusable by any adapter with a text-based
 * source instead of a one-off `fetch()` call in the adapter.
 */
export async function fetchText(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<string> {
  const { timeoutMs = 8000, headers = {} } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GeoResponde-Gateway/1.0',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`REST transport responded with status: ${res.status}`);
    }

    return (await res.text()).replace(/^﻿/, '');
  } finally {
    clearTimeout(timeout);
  }
}
