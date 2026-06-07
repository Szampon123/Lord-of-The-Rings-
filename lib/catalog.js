import { config } from '../config.js';
import { getAllSets } from './bricksetApi.js';

/** Full set number in Brickset's canonical form, e.g. "10316-1". */
function fullNumber(s) {
  const variant = s.numberVariant ?? 1;
  return `${s.number}-${variant}`;
}

function retailPrices(legoCom) {
  const out = {};
  for (const country of ['US', 'UK', 'CA', 'DE']) {
    const detail = legoCom?.[country];
    if (detail && detail.retailPrice != null) out[country] = detail.retailPrice;
  }
  return out;
}

function lifecycle(s) {
  const now = Date.now();
  const exit = s.exitDate ? Date.parse(s.exitDate) : null;
  if (exit && exit < now) return 'retired';
  if (s.released) return 'current';
  return 'upcoming';
}

function normalize(s) {
  const number = fullNumber(s);
  return {
    setID: s.setID,
    number,
    name: s.name,
    year: s.year,
    theme: s.theme,
    subtheme: s.subtheme || '',
    themeGroup: s.themeGroup || '',
    pieces: s.pieces ?? null,
    minifigCount: s.minifigs ?? 0,
    image: s.image?.imageURL || s.image?.thumbnailURL || null,
    bricksetURL: s.bricksetURL || `${config.bricksetBase}/sets/${number}`,
    minifigPagePath: `/minifigs/in-${number}`,
    status: lifecycle(s),
    retail: retailPrices(s.LEGOCom),
    rating: s.rating ?? null,
    resale: null,
    minifigs: [],
  };
}

/**
 * Pull the LOTR + Hobbit catalogue from the official API.
 * We issue one query per configured theme and one per configured subtheme,
 * then de-duplicate by setID.
 */
export async function buildCatalog() {
  const bySetId = new Map();
  const queries = [];

  for (const theme of config.themes) {
    queries.push({ theme });
  }

  for (const subtheme of config.subthemes) {
    queries.push({ subtheme });
  }

  for (const q of queries) {
    const sets = await getAllSets(q);
    for (const raw of sets) {
      const set = normalize(raw);
      if (!bySetId.has(set.setID)) bySetId.set(set.setID, set);
    }
  }

  const catalog = [...bySetId.values()];
  catalog.sort(
    (a, b) => (b.year || 0) - (a.year || 0) || a.number.localeCompare(b.number)
  );
  return catalog;
}
