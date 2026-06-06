import { config } from '../config.js';
import { isAllowed } from './robots.js';

/**
 * A polite HTTP reader for public Brickset pages.
 *
 * Guarantees:
 *   - Never runs unless ENABLE_PAGE_READER=true.
 *   - Never fetches a path that robots.txt disallows for our user-agent.
 *   - Serialises requests with a minimum delay between them (no bursts).
 *   - Sends an honest, identifiable User-Agent.
 *
 * If a path is disallowed, it throws a DisallowedError so callers can record
 * "unavailable" rather than silently working around the site's wishes.
 */

export class DisallowedError extends Error {
  constructor(pathname) {
    super(`robots.txt disallows automated access to ${pathname}`);
    this.name = 'DisallowedError';
    this.pathname = pathname;
  }
}

let chain = Promise.resolve();
let lastAt = 0;

function throttle() {
  // Queue this call behind the previous one, then wait out the delay.
  const run = chain.then(async () => {
    const wait = Math.max(0, config.pageReader.delayMs - (Date.now() - lastAt));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
  });
  chain = run.catch(() => {});
  return run;
}

export async function readPage(pathname) {
  if (!config.pageReader.enabled) {
    throw new Error('Page reader is disabled (set ENABLE_PAGE_READER=true to opt in).');
  }
  if (!(await isAllowed(pathname))) {
    throw new DisallowedError(pathname);
  }

  await throttle();

  const res = await fetch(`${config.bricksetBase}${pathname}`, {
    headers: {
      'User-Agent': config.pageReader.userAgent,
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`GET ${pathname} → HTTP ${res.status}`);
  return res.text();
}
