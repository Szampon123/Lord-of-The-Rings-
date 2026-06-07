import { config, assertConfigured } from '../config.js';
import { buildCatalog } from './catalog.js';
import { setCatalog } from './blobs.js';
import { getSetValueProvider } from './priceProviders/index.js';
import { readMinifigValues } from './priceProviders/bricksetMinifig.js';

let refreshing = false;

/**
 * Full refresh:
 *   1. Build the catalogue (official API) — retail/new prices + metadata.
 *   2. Enrich each set with used-set resale (selected provider).
 *   3. If the page reader is enabled, enrich with per-minifig values.
 * Steps 2-3 degrade gracefully: failures become "unavailable", never crashes.
 */
export async function runRefresh() {
  if (refreshing) return readCache();
  refreshing = true;
  const startedAt = new Date().toISOString();
  try {
    assertConfigured();
    const catalog = await buildCatalog();

    const setValueProvider = getSetValueProvider();
    const notes = [];

    for (const set of catalog) {
      // Used-set resale value (provider-driven; default returns null).
      try {
        set.resale = await setValueProvider.getSetResale(set);
      } catch (err) {
        set.resale = null;
        notes.push(`resale ${set.number}: ${err.message}`);
      }

      // Per-minifig values (opt-in, robots-aware).
      if (config.pageReader.enabled && set.minifigCount > 0) {
        const { figures, note } = await readMinifigValues(set);
        set.minifigs = figures;
        if (note) notes.push(`minifigs ${set.number}: ${note}`);
      }
    }

    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        startedAt,
        setCount: catalog.length,
        themes: config.themes,
        subthemes: config.subthemes,
        primaryRetailCountry: config.primaryRetailCountry,
        pageReaderEnabled: config.pageReader.enabled,
        setValueProvider: config.setValueProvider,
        notes: notes.slice(0, 50),
      },
      sets: catalog,
    };

    await setCatalog(payload);
    return payload;
  } finally {
    refreshing = false;
  }
}

