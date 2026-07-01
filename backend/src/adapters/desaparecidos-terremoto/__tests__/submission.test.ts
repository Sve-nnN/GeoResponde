import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HumanitarianProvider, Report } from '@georesponde/shared';
import { DesaparecidosTerremotoAdapter } from '../adapter.js';

const FAKE_CEDULA = '00000123';

const provider: HumanitarianProvider = {
  id: 'prov-desaparecidos-terremoto',
  display_name: 'Desaparecidos Terremoto VE',
  website: 'https://desaparecidosterremotovenezuela.com/',
  description: 'synthetic test provider',
  logo: '/logos/desaparecidos-terremoto.png',
  status: 'active',
  adapter: 'DesaparecidosTerremotoAdapter',
  capabilities: ['search', 'submission'],
};

const report: Report = {
  id: 'rep-synthetic-0003',
  topic: 'missing-person',
  createdAt: '2026-07-01T00:00:00.000Z',
  fields: {
    fullName: 'Ana Prueba',
    age: 34,
    lastSeenLocation: 'Plaza Ejemplo',
    cedula: FAKE_CEDULA,
  },
  consent: { targets: ['prov-desaparecidos-terremoto'], acknowledgedAt: '2026-07-01T00:00:00.000Z' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DesaparecidosTerremotoAdapter.submit (REP-08 deep_link handoff)', () => {
  it('returns an ok dry-run deep_link action', async () => {
    const adapter = new DesaparecidosTerremotoAdapter(provider);
    const result = await adapter.submit(report);
    expect(result.status).toBe('ok');
    expect(result.mode).toBe('dry-run');
    expect(result.action?.tier).toBe('deep_link');
    expect(result.action?.actionUrl?.startsWith(provider.website)).toBe(true);
    expect(result.action?.body).toContain('Ana Prueba');
  });

  it('NEVER puts the cédula in the deep-link URL (but keeps it in the manual body)', async () => {
    const adapter = new DesaparecidosTerremotoAdapter(provider);
    const result = await adapter.submit(report);
    expect(result.action?.actionUrl).not.toContain(FAKE_CEDULA);
    expect(result.action?.body).toContain(FAKE_CEDULA);
  });

  it('makes ZERO network calls (no headless submit, no scrape-to-write)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const adapter = new DesaparecidosTerremotoAdapter(provider);
    await adapter.submit(report);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('declares the deep_link submission capability for missing-person', () => {
    const adapter = new DesaparecidosTerremotoAdapter(provider);
    expect(adapter.submissionMode).toBe('deep_link');
    expect(adapter.submissionTopics).toContain('missing-person');
  });
});
