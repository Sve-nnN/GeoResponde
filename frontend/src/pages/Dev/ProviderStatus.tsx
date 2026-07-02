import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE, fetchProviderHealth } from '../../lib/api';
import { classifyBadge, formatAvailability, type ProviderHealthSnapshot } from '../../lib/health';
import { HealthBadge } from '../../components/Dev/HealthBadge';
import { Sparkline } from '../../components/Dev/Sparkline';

/** Poll cadence. Intentionally shorter than the server's 60s probe throttle
 * (`THROTTLE_MS` in `repo/backend/src/gateway/health/HealthProbeService.ts`)
 * — the endpoint returns its cached snapshot between real probes, so extra
 * polls are cheap reads, not extra upstream load (T-19-06). Do NOT lower
 * this expecting more frequent real probes.
 */
const POLL_INTERVAL_MS = 30_000;

interface Provider {
  id: string;
  display_name: string;
  status: string;
  adapter: string;
  capabilities: string[];
}

/** A snapshot for a provider with no health data yet (absent from the map). */
const WARMING_SNAPSHOT: ProviderHealthSnapshot = {
  averageLatencyMs: null,
  lastSuccessAt: null,
  consecutiveFailures: 0,
  samples: [],
  up: 0,
  total: 0,
};

/**
 * Observability dashboard for the provider health endpoint shipped in
 * Phase 18 (HEALTH-08..11). Migrated from the one-shot `/api/dev/inspect/:id`
 * probe: this page fetches provider display names once from `/api/providers`,
 * polls `GET /api/health/providers` (no query params — the endpoint owns its
 * own internal probe query, T-18-01/T-19-05), and joins the two by id.
 */
export function ProviderStatus() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [health, setHealth] = useState<Record<string, ProviderHealthSnapshot>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch(`${API_BASE}/api/providers`)
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch((err) => console.error('Failed to load providers', err));
  }, []);

  const pollHealth = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await fetchProviderHealth();
      setHealth(snapshot);
      setNow(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(pollHealth, POLL_INTERVAL_MS);
  }, [pollHealth]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current === null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  // Initial poll + interval lifecycle, paused while the tab is hidden.
  useEffect(() => {
    pollHealth();

    if (!document.hidden) startPolling();

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        pollHealth();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Relative "Xm ago" label; absolute ISO time is exposed via the cell's `title`. */
  const relativeLabel = (epochMs: number): string => {
    const diffMs = now - epochMs;
    const diffSec = Math.max(Math.round(diffMs / 1000), 0);
    if (diffSec < 60) return t('dev.providerStatus.relativeNow');
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.round(diffHr / 24);
    return `${diffDay}d`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t('dev.providerStatus.title')}</h2>
        <button
          onClick={pollHealth}
          disabled={refreshing}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: '#3498db',
            color: '#fff',
            cursor: refreshing ? 'default' : 'pointer',
            fontWeight: 600,
            opacity: refreshing ? 0.7 : 1,
          }}
        >
          {refreshing ? t('dev.providerStatus.refreshing') : t('dev.providerStatus.refresh')}
        </button>
      </div>

      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '12px',
          lineHeight: 1.4,
          marginBottom: '1rem',
        }}
      >
        {t('dev.providerStatus.statelessNote')}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #ddd' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colProvider')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colAdapter')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colBadge')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colAvailability')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colLatency')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colLastSuccess')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colFailures')}</th>
              <th style={{ padding: '12px 16px' }}>{t('dev.providerStatus.colHistory')}</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => {
              const snap = health[p.id] ?? WARMING_SNAPSHOT;
              const badgeState = classifyBadge(snap);
              const availability = formatAvailability(snap);
              const isWarmingAvailability = availability === 'warming';
              const lastSuccessIso = snap.lastSuccessAt !== null ? new Date(snap.lastSuccessAt).toISOString() : undefined;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.display_name}</td>
                  <td style={{ padding: '12px 16px', color: '#666', fontSize: '14px' }}>{p.adapter}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <HealthBadge state={badgeState} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {isWarmingAvailability ? t('dev.providerStatus.warmingUp') : availability}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {snap.averageLatencyMs !== null
                      ? `${Math.round(snap.averageLatencyMs)}${t('dev.providerStatus.latencyUnit')}`
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }} title={lastSuccessIso}>
                    {snap.lastSuccessAt !== null ? relativeLabel(snap.lastSuccessAt) : t('dev.providerStatus.never')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{snap.consecutiveFailures}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Sparkline samples={snap.samples} />
                  </td>
                </tr>
              );
            })}
            {providers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                  {t('dev.providerStatus.loading')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
