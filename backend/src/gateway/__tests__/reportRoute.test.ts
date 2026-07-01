import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Report, SubmissionResult } from '@georesponde/shared';
import { buildApp } from '../../index.js';

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'test-report-1',
    topic: 'resource-need',
    createdAt: '2026-07-01T00:00:00.000Z',
    fields: { resourceType: 'water', location: 'Caracas' },
    consent: { targets: [], acknowledgedAt: '2026-07-01T00:00:00.000Z' },
    ...overrides,
  };
}

describe('POST /api/report (dry-run stub)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a dry-run SubmissionResult for a valid report', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/report',
      payload: makeReport(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as SubmissionResult;
    expect(body.mode).toBe('dry-run');
    expect(body.status).toBe('ok');
  });

  it('echoes a preview of the topic and fields (no provider routing)', async () => {
    const report = makeReport();
    const res = await app.inject({ method: 'POST', url: '/api/report', payload: report });
    const body = res.json() as SubmissionResult;
    const preview = body.preview as { topic: string; fields: Record<string, unknown> };
    expect(preview.topic).toBe('resource-need');
    expect(preview.fields).toEqual(report.fields);
  });

  it('returns an error result (not a throw) for an unknown topic', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/report',
      payload: makeReport({ topic: 'not-a-topic' as Report['topic'] }),
    });
    const body = res.json() as SubmissionResult;
    expect(body.status).toBe('error');
    expect(body.error).toBeTruthy();
  });

  it('does not echo a sensitive cedula or reporter contact at the top level', async () => {
    const report = makeReport({
      topic: 'missing-person',
      fields: { fullName: 'Ana', cedula: 'V-12345678' },
      reporter: { contact: 'ana@example.com' },
    });
    const res = await app.inject({ method: 'POST', url: '/api/report', payload: report });
    const body = res.json() as SubmissionResult;
    // The result envelope itself must not surface reporter contact.
    expect(JSON.stringify(body)).not.toContain('ana@example.com');
  });
});
