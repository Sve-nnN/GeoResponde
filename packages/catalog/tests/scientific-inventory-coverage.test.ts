import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

interface CatalogLayer {
  id: string;
  category?: string;
  datasetIds?: string[];
}

interface CatalogDataset {
  id: string;
  sourceId?: string;
}

interface CatalogSource {
  id: string;
  name: string;
  url?: string;
}

const layers: CatalogLayer[] = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../public/catalog/layers.json'), 'utf-8'),
);
const datasets: CatalogDataset[] = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../public/catalog/datasets.json'), 'utf-8'),
);
const sources: CatalogSource[] = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../public/catalog/sources.json'), 'utf-8'),
);
const docText = readFileSync(
  path.resolve(__dirname, '../../../docs/research/scientific-intelligence-catalog.md'),
  'utf-8',
);

/**
 * Walk the catalog graph: Scientific-category layers -> their datasetIds ->
 * matching datasets -> each dataset's sourceId -> matching source. Returns the
 * unique set of resolved sources (deduped by source id), excluding unfilled
 * example.com/placeholder stubs.
 */
function resolveScientificSources(): CatalogSource[] {
  const datasetById = new Map(datasets.map((d) => [d.id, d]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const scientificLayers = layers.filter((l) => l.category === 'Scientific');

  const resolved = new Map<string, CatalogSource>();
  for (const layer of scientificLayers) {
    for (const datasetId of layer.datasetIds ?? []) {
      const dataset = datasetById.get(datasetId);
      if (!dataset?.sourceId) continue;
      const source = sourceById.get(dataset.sourceId);
      if (!source) continue;
      resolved.set(source.id, source);
    }
  }

  return [...resolved.values()].filter((s) => !(s.url ?? '').includes('example.com/placeholder'));
}

describe('Scientific Intelligence Layers inventory coverage', () => {
  const scientificSources = resolveScientificSources();

  it('resolves at least one real (non-placeholder) scientific source from the catalog graph', () => {
    expect(scientificSources.length).toBeGreaterThan(0);
  });

  it('documents every real scientific source in docs/research/scientific-intelligence-catalog.md', () => {
    const missing = scientificSources.filter((source) => {
      const needle = source.url && source.url.trim() ? source.url : source.name;
      return !docText.includes(needle);
    });

    expect(
      missing.length,
      `The following scientific sources resolved from the catalog graph (layers -> datasets -> sources) ` +
        `are missing from docs/research/scientific-intelligence-catalog.md:\n` +
        missing
          .map((s) => `  - id: ${s.id}, name: "${s.name}", url: "${s.url ?? '(none)'}"`)
          .join('\n'),
    ).toBe(0);
  });
});
