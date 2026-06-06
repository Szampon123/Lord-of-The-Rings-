/**
 * The default used-set resale provider.
 *
 * It deliberately returns nothing. Brickset serves set-level new/used resale
 * values only from its `/ajax/` endpoints, which robots.txt disallows for
 * automated access, and those numbers are BrickLink-sourced rather than
 * Brickset's own. Rather than work around that, the default simply reports the
 * value as unavailable. Implement an authorised provider and select it with
 * SET_VALUE_PROVIDER to populate the Used tab.
 */
export const id = 'null';

export async function getSetResale(/* set */) {
  return null;
}
