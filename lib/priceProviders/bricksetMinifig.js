import * as cheerio from 'cheerio';
import { readPage, DisallowedError } from '../pageReader.js';

/**
 * Reads the PUBLIC per-set minifigure list (e.g. /minifigs/in-10316-1) and
 * extracts each figure's "Value new" / "Value used". These values are
 * BrickLink-sourced and displayed by Brickset.
 *
 * This runs only when ENABLE_PAGE_READER=true AND robots.txt permits the path.
 * If robots.txt disallows it, we return an empty result and record why — we do
 * not attempt to bypass it.
 */

function parseMoney(text) {
  if (!text) return null;
  const m = text.replace(/,/g, '').match(/([£$€])\s*([\d.]+)/);
  if (!m) return null;
  return { currency: m[1], amount: Number(m[2]) };
}

export async function readMinifigValues(set) {
  const result = { figures: [], note: null };
  try {
    const html = await readPage(set.minifigPagePath);
    const $ = cheerio.load(html);

    // Brickset renders each minifig as a card/list item. We locate value labels
    // robustly by text rather than relying on brittle class names: for each
    // "Value new"/"Value used" label we read the adjacent value.
    $('*').each((_, el) => {
      const $el = $(el);
      const label = $el.text().trim().toLowerCase();
      if (label !== 'value new' && label !== 'value used') return;

      // Find the nearest enclosing minifig card to attribute the value.
      const card = $el.closest('li, .item, .set, article, tr');
      const cardKey = card.length ? card.html() : null;
      if (!cardKey) return;

      const valueText = $el.next().text() || $el.parent().text();
      const money = parseMoney(valueText);
      if (!money) return;

      // Identify the figure within the card.
      const number =
        card.find('a[href*="/minifigs/"]').first().attr('href')?.split('/').pop() ||
        card.find('h1,h2,h3,.name').first().text().trim() ||
        'unknown';
      const name = card.find('h1,h2,h3,.name').first().text().trim() || number;

      let fig = result.figures.find((f) => f.number === number);
      if (!fig) {
        fig = { number, name, valueNew: null, valueUsed: null, currency: money.currency, url: null };
        const href = card.find('a[href*="/minifigs/"]').first().attr('href');
        if (href) fig.url = href.startsWith('http') ? href : `https://brickset.com${href}`;
        result.figures.push(fig);
      }
      if (label === 'value new') fig.valueNew = money.amount;
      else fig.valueUsed = money.amount;
    });

    if (!result.figures.length) {
      result.note = 'No minifig values found on the page (layout may have changed).';
    }
  } catch (err) {
    if (err instanceof DisallowedError) {
      result.note = `Skipped: ${err.message}`;
    } else {
      result.note = `Reader error: ${err.message}`;
    }
  }
  return result;
}
