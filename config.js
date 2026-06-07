import 'dotenv/config';

function list(value, fallback) {
  return (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  apiKey: process.env.BRICKSET_API_KEY || '',
  port: Number(process.env.PORT) || 3000,
  refreshCron: process.env.REFRESH_CRON || '0 4 * * *',

  themes: list(process.env.THEMES, 'The Lord of the Rings,The Hobbit'),
  subthemes: list(process.env.SUBTHEMES, 'The Lord of the Rings,The Hobbit'),

  pageReader: {
    enabled: String(process.env.ENABLE_PAGE_READER).toLowerCase() === 'true',
    delayMs: Number(process.env.PAGE_READER_DELAY_MS) || 4000,
    userAgent:
      process.env.USER_AGENT ||
      'MiddleEarthBrickIndex/1.0 (personal/educational)',
  },

  setValueProvider: process.env.SET_VALUE_PROVIDER || 'null',

  // The country whose retail price we treat as the headline figure.
  primaryRetailCountry: 'US',

  paths: {
    // Paths are not used on Netlify (only for local Express dev)
    root: null,
    public: null,
    cacheFile: null,
  },

  bricksetBase: 'https://brickset.com',
  apiBase: 'https://brickset.com/api/v3.asmx',
};

export function assertConfigured() {
  if (!config.apiKey) {
    throw new Error(
      'BRICKSET_API_KEY is not set. Copy .env.example to .env and add your key ' +
        '(request one at https://brickset.com/tools/webservices/requestkey).'
    );
  }
}
