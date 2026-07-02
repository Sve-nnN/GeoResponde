/**
 * Base URL of the Provider Gateway API.
 *
 * Reads `VITE_API_URL` at build time so the same frontend build can point at a
 * local gateway in development and a deployed gateway in production. Falls back
 * to the local dev gateway when the variable is not set.
 *
 * Set it in a `.env` file or in the hosting provider's environment, e.g.:
 *   VITE_API_URL=https://georesponde-gateway.example.com
 */
export const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3001';

import type { ProviderHealthSnapshot } from './health';

/**
 * Fetch the current per-provider health snapshot map from the observability
 * endpoint shipped in Phase 18. Sends NO query string — the endpoint owns
 * its own internal probe query (T-18-01); the client must never send `q`
 * here (T-19-05).
 *
 * Degrade-safe: on any network/parse error this resolves to `{}` rather
 * than throwing, mirroring the endpoint's own degrade-safe contract, so a
 * transient fetch failure never crashes the dashboard.
 */
export async function fetchProviderHealth(): Promise<Record<string, ProviderHealthSnapshot>> {
  try {
    const res = await fetch(`${API_BASE}/api/health/providers`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
