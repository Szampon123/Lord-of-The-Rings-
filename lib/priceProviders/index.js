import { config } from '../../config.js';
import * as nullProvider from './nullSetValue.js';

/**
 * Registry of used-set resale providers. Add your own module (exporting `id`
 * and `getSetResale(set)`) and register it here, then select it via
 * SET_VALUE_PROVIDER in .env.
 *
 * Kept intentionally small: the compliant default is `null`. A Brickset-based
 * provider is NOT registered by default because the set-level value endpoint is
 * robots-disallowed; only enable an authorised source.
 */
const providers = {
  [nullProvider.id]: nullProvider,
};

export function getSetValueProvider() {
  return providers[config.setValueProvider] || nullProvider;
}
