import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTerremotoVenezuelaResponse } from '../parser.js';

describe('TerremotoVenezuela Parser', () => {
  const fixturePath = path.join(__dirname, '../fixtures/buildings.json');
  const rows = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('normalizes every building row', () => {
    expect(parseTerremotoVenezuelaResponse(rows)).toHaveLength(2);
  });

  it('maps core building fields', () => {
    const [first] = parseTerremotoVenezuelaResponse(rows);
    expect(first.provider).toBe('Terremoto Venezuela');
    expect(first.type).toBe('building');
    expect(first.title).toBe('Edificio Prueba Uno');
    expect(first.subtitle).toBe('Avenida Ejemplo 100 · Ciudad Ejemplo · Parroquia Sintetica');
    expect(first.status).toBe('severo');
    expect(first.location).toEqual([-66.9, 10.5]);
    expect(first.url).toBe('https://terremotovenezuela.com/');
    expect(first.metadata).toMatchObject({ damage_level: 'severo', has_missing_persons: false });
  });

  it('drops invalid coordinates', () => {
    const second = parseTerremotoVenezuelaResponse(rows)[1];
    expect(second.location).toBeUndefined();
    expect(second.title).toBe('Residencia Ejemplo Dos');
    expect(second.metadata).toMatchObject({ has_missing_persons: true });
  });

  it('never surfaces trapped names or casualty notes', () => {
    const serialized = JSON.stringify(parseTerremotoVenezuelaResponse(rows));
    expect(serialized).not.toContain('trapped');
    expect(serialized).not.toContain('casualt');
    expect(serialized).not.toContain('REDACTED');
  });

  it('returns [] for a non-array response', () => {
    expect(parseTerremotoVenezuelaResponse(null)).toEqual([]);
    expect(parseTerremotoVenezuelaResponse({})).toEqual([]);
  });
});
