import { config } from '../config.js';

const MAX_PAGE_SIZE = 500;

async function call(method, fields) {
  const body = new URLSearchParams({
    apiKey: config.apiKey,
    ...fields,
  });

  const url = `${config.apiBase}/${method}`;

  console.log('[brickset] method:', method);
  console.log('[brickset] url:', url);
  console.log('[brickset] body:', body.toString());

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  const text = await res.text();

  console.log('[brickset] status:', res.status);
  console.log('[brickset] raw response:', text);

  if (!res.ok) {
    throw new Error(`Brickset API ${method} returned HTTP ${res.status}: ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Brickset API ${method} returned non-JSON response: ${text}`);
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

export async function getAllSets(params) {
  const out = [];
  let pageNumber = 1;

  for (let guard = 0; guard < 50; guard += 1) {
    const merged = { ...params, pageSize: MAX_PAGE_SIZE, pageNumber };
    const data = await call('getSets', { params: JSON.stringify(merged) });
    const sets = data.sets || [];
    out.push(...sets);

    if (sets.length < MAX_PAGE_SIZE) break;
    pageNumber += 1;
  }

  return out;
}

export async function getKeyUsage() {
  try {
    const data = await call('getKeyUsageStats', {});
    return data.apiKeyUsage || [];
  } catch {
    return [];
  }
}
