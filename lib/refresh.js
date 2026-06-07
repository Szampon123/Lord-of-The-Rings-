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
    let catalog;
    try {
      catalog = await buildCatalog();
    } catch (apiError) {
      console.warn('[refresh] API failed, using sample data:', apiError.message);
      catalog = getSampleCatalog();
    }

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

/**
 * Sample catalog (fallback when API is down)
 */
function getSampleCatalog() {
  return [
    {
      number: '10316-1',
      name: 'Rivendell',
      theme: 'The Lord of the Rings',
      subtheme: 'Icons',
      year: 2023,
      pieces: 6167,
      minifigCount: 21,
      retail: {
        US: 499.99,
        UK: 429.99,
        CA: null,
        DE: 499.99,
      },
      resale: null,
      minifigs: [
        { id: 'lor129', name: 'Aragorn', new: 17.39, used: 15.30 },
        { id: 'lor121', name: 'Arwen', new: 19.60, used: 19.37 },
        { id: 'lor120', name: 'Rivendell Elf', new: 13.77, used: 14.32 },
      ],
    },
    {
      number: '10333-1',
      name: 'Barad-dûr',
      theme: 'The Lord of the Rings',
      subtheme: 'Icons',
      year: 2024,
      pieces: 5471,
      minifigCount: 11,
      retail: {
        US: 459.99,
        UK: 399.99,
        CA: 599.99,
        DE: 459.99,
      },
      resale: null,
      minifigs: [],
    },
  ];
}

