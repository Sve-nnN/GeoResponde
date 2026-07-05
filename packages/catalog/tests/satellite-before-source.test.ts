import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Regression guard for issue #46: the `ds-satellite-before` dataset describes
// Esri World Imagery, so it must resolve to an Esri source, not to the USGS
// Data Series 199 geologic map it used to be mislinked to.

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

function load(name: string) {
  return JSON.parse(readFileSync(resolve(root, 'public/catalog', name), 'utf8'));
}

describe('ds-satellite-before source mapping (#46)', () => {
  const datasets = load('datasets.json');
  const sources = load('sources.json');

  const dataset = datasets.find((d: { id: string }) => d.id === 'ds-satellite-before');
  const source = sources.find((s: { id: string }) => s.id === dataset?.sourceId);

  it('resolves to a source that exists', () => {
    expect(dataset).toBeDefined();
    expect(source).toBeDefined();
  });

  it('does not point at the USGS geologic map source', () => {
    expect(dataset.sourceId).not.toBe('src-usgs-ds-199');
  });

  it('points at an Esri World Imagery source', () => {
    expect(source.url).toMatch(/arcgisonline\.com|esri/i);
    expect(source.name).toMatch(/esri/i);
  });
});
