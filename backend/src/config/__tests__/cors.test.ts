import { describe, it, expect } from 'vitest';
import { resolveCorsOrigin } from '../cors.js';

describe('resolveCorsOrigin', () => {
  it('returns true (reflect any origin) when CORS_ALLOWED_ORIGINS is unset', () => {
    expect(resolveCorsOrigin({})).toBe(true);
  });

  it('returns true when CORS_ALLOWED_ORIGINS is an empty string', () => {
    expect(resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: '' })).toBe(true);
  });

  it('returns true when CORS_ALLOWED_ORIGINS is only whitespace', () => {
    expect(resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: '   ' })).toBe(true);
  });

  it('returns true when CORS_ALLOWED_ORIGINS is only commas/whitespace', () => {
    expect(resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: ' , , ' })).toBe(true);
  });

  it('parses a single origin into a one-element array', () => {
    expect(resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: 'https://a.app' })).toEqual([
      'https://a.app',
    ]);
  });

  it('parses a comma-separated list and trims whitespace', () => {
    expect(
      resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: 'https://a.app,  https://b.app ,https://c.app' }),
    ).toEqual(['https://a.app', 'https://b.app', 'https://c.app']);
  });

  it('drops empty entries from a trailing or doubled comma', () => {
    expect(
      resolveCorsOrigin({ CORS_ALLOWED_ORIGINS: 'https://a.app,,https://b.app,' }),
    ).toEqual(['https://a.app', 'https://b.app']);
  });

  it('defaults to process.env when no argument is passed', () => {
    const original = process.env.CORS_ALLOWED_ORIGINS;
    try {
      process.env.CORS_ALLOWED_ORIGINS = 'https://from-env.app';
      expect(resolveCorsOrigin()).toEqual(['https://from-env.app']);
    } finally {
      if (original === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
      else process.env.CORS_ALLOWED_ORIGINS = original;
    }
  });
});
