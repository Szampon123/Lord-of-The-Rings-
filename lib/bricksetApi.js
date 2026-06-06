import { config } from '../config.js';

/**
 * Minimal client for the official Brickset API v3.
 * Docs: https://brickset.com/article/52664/api-version-3-documentation
 *
 * Only the `getSets` method is used. Parameters are passed as a JSON string in
 * the `params` field, per the API spec. We POST as form-urlencoded so long
 * parameter strings are accepted.
 */

const MAX_PAGE_SIZE = 500; // API maximum

async function call(method, fields) {
  const body = new URLSearchParams({ apiKey: config.apiKey, ...fields });
  const res = await fetch(`${config.apiBase}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': config.pageReader.userAgent,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Brickset API ${method} returned HTTP ${res.status}`);
  }

  // The API historically returned text/json; newer versions set application/json.
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Brickset API ${method} returned non-JSON response`);
  }

  if (data.status !== 'success') {
    throw new Error(`Brickset API ${method} error: ${data.message || 'unknown'}`);
  }
  return data;
}

export async function checkKey() {
  const data = await call('checkKey', {});
  return data.status === 'success';
}

/**
 * Retrieve every set matching a getSets parameter object, following pagination.
 * `params` is a plain object (e.g. { theme: 'The Hobbit' }); it is serialised to
 * the JSON string the API expects. Returns the raw `sets` array.
 */
export async function getAllSets(params) {
  const out = [];
  let pageNumber = 1;
  // Guard against runaway loops; LOTR/Hobbit is a few dozen sets.
  for (let guard = 0; guard < 50; guard += 1) {
    const merged = { ...params, pageSize: MAX_PAGE_SIZE, pageNumber };
    const data = await call('getSets', { params: JSON.stringify(merged) });
    const sets = data.sets || [];
    out.push(...sets);
    if (sets.length < MAX_PAGE_SIZE) break; // last page
    pageNumber += 1;
  }
  return out;
}

/**
 * Return how many getSets calls remain useful today is not exposed directly,
 * but getKeyUsageStats reports the last 30 days. Handy for diagnostics.
 */
export async function getKeyUsage() {
  try {
    const data = await call('getKeyUsageStats', {});
    return data.apiKeyUsage || [];
  } catch {
    return [];
  }
}
