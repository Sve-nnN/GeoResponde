import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { toNegentropyCollection, NEGENTROPY_ATTRIBUTION } from '../parser.js';

const hospitales = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/hospitales.json'), 'utf8'),
);
const edificaciones = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/edificaciones.json'), 'utf8'),
);

describe('toNegentropyCollection', () => {
  it('keeps a valid Point feature and drops bad coordinates and non-Point geometry', () => {
    const c = toNegentropyCollection(hospitales);
    expect(c.features).toHaveLength(1);
    const f = c.features[0] as { properties: Record<string, unknown> };
    expect(f.properties.id).toBe('syn-hosp-001');
  });

  it('tags every feature with the Negentropy attribution', () => {
    const c = toNegentropyCollection(hospitales);
    const f = c.features[0] as { properties: Record<string, unknown> };
    expect(f.properties.source).toBe(NEGENTROPY_ATTRIBUTION);
  });

  it('preserves nivel_dano/estatus/notas for edificaciones (NEGENTROPY-05)', () => {
    const c = toNegentropyCollection(edificaciones);
    const f = c.features[0] as { properties: Record<string, unknown> };
    expect(f.properties.nivel_dano).toBe('total');
    expect(f.properties.estatus).toBe('verificado');
    expect(f.properties.notas).toBe('Nota sintetica de prueba');
  });

  it('never throws on garbage input', () => {
    expect(toNegentropyCollection(null)).toEqual({ type: 'FeatureCollection', features: [] });
    expect(toNegentropyCollection({ features: 'nope' })).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(toNegentropyCollection(undefined)).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });
});
