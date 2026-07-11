import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { toEarthquakeCollection, FUNVISIS_ATTRIBUTION } from '../parser.js';

const fixture = fs.readFileSync(
  path.join(__dirname, '../fixtures/catalog.csv'),
  'utf8',
);

describe('toEarthquakeCollection — funvisis-catalog CSV normalization', () => {
  it('normalizes usable rows and drops rows with bad coordinates', () => {
    const c = toEarthquakeCollection(fixture);
    expect(c.features.map((f) => f.properties.id)).toEqual([
      'ISC_syn_001',
      'FUNVISIS_R_syn_001',
      'FUNVISIS_R_syn_002',
    ]);
  });

  it('parses lat/lng, magnitude, depth, and ISO time directly (no timezone math needed)', () => {
    const c = toEarthquakeCollection(fixture);
    const f = c.features.find((x) => x.properties.id === 'FUNVISIS_R_syn_001')!;
    expect(f.geometry.coordinates).toEqual([-68.9, 10.5]);
    expect(f.properties.mag).toBe(3.8);
    expect(f.properties.place).toBe('25 km al norte de Barquisimeto');
    expect(f.properties.depth).toBe(12.0);
    expect(f.properties.time).toBe(Date.parse('2026-06-30T18:32:00.0Z'));
  });

  it('tags every feature with the funvisis-catalog attribution', () => {
    const c = toEarthquakeCollection(fixture);
    expect(c.features.every((f) => f.properties.source === FUNVISIS_ATTRIBUTION)).toBe(true);
  });

  it('drops a row whose column count does not match the header (e.g. an unescaped comma in place)', () => {
    const c = toEarthquakeCollection(fixture);
    expect(c.features.some((f) => f.properties.id === 'FUNVISIS_R_syn_extra')).toBe(false);
  });

  it('covers both author regimes (ISC and FUNVISIS-OCR rows)', () => {
    const c = toEarthquakeCollection(fixture);
    expect(c.features.map((f) => f.properties.id)).toContain('ISC_syn_001');
    expect(c.features.map((f) => f.properties.id)).toContain('FUNVISIS_R_syn_001');
  });

  it('never throws on garbage input', () => {
    expect(toEarthquakeCollection('')).toEqual({ type: 'FeatureCollection', features: [] });
    expect(toEarthquakeCollection('not,even,a,real,header\n1,2,3')).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(toEarthquakeCollection(null as unknown as string)).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });
});
