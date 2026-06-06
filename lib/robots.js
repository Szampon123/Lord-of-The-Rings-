import { config } from '../config.js';

/**
 * A small, dependency-free robots.txt fetcher + matcher.
 *
 * It implements the parts of the Robots Exclusion Protocol that matter here:
 * grouping by User-agent, Allow/Disallow rules, longest-match-wins, and the
 * `*` wildcard plus `$` end-anchor. When in doubt it errs toward DISALLOW, so
 * the page reader never touches a path the site asks bots to avoid.
 */

let cache = null; // { fetchedAt, groups }

function parse(txt) {
  const groups = []; // { agents:[], rules:[{ allow:boolean, path:string }] }
  let current = null;
  let lastLineWasAgent = false;

  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
    } else if (field === 'allow' || field === 'disallow') {
      if (!current) {
        current = { agents: ['*'], rules: [] };
        groups.push(current);
      }
      current.rules.push({ allow: field === 'allow', path: value });
      lastLineWasAgent = false;
    } else {
      lastLineWasAgent = false;
    }
  }
  return groups;
}

function selectGroup(groups, ua) {
  const uaLower = ua.toLowerCase();
  let specific = null;
  let star = null;
  for (const g of groups) {
    for (const agent of g.agents) {
      if (agent === '*') star = star || g;
      else if (uaLower.includes(agent)) specific = specific || g;
    }
  }
  return specific || star || null;
}

// Convert a robots path pattern (with * and $) into a RegExp.
function patternToRegExp(pattern) {
  let re = '^';
  for (const ch of pattern) {
    if (ch === '*') re += '.*';
    else if (ch === '$') re += '$';
    else re += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(re);
}

async function load() {
  if (cache && Date.now() - cache.fetchedAt < 6 * 60 * 60 * 1000) return cache;
  let groups = [];
  try {
    const res = await fetch(`${config.bricksetBase}/robots.txt`, {
      headers: { 'User-Agent': config.pageReader.userAgent },
    });
    if (res.ok) groups = parse(await res.text());
  } catch {
    // Network failure → treat as "everything disallowed" for safety.
    groups = [{ agents: ['*'], rules: [{ allow: false, path: '/' }] }];
  }
  cache = { fetchedAt: Date.now(), groups };
  return cache;
}

/**
 * Returns true if `pathname` may be fetched by our user-agent per robots.txt.
 * Longest matching rule wins; ties go to Allow.
 */
export async function isAllowed(pathname) {
  const { groups } = await load();
  const group = selectGroup(groups, config.pageReader.userAgent);
  if (!group) return true; // no rules at all → allowed

  let best = null; // { allow, length }
  for (const rule of group.rules) {
    if (rule.path === '') continue; // empty Disallow = allow all, no constraint
    if (patternToRegExp(rule.path).test(pathname)) {
      const length = rule.path.length;
      if (!best || length > best.length || (length === best.length && rule.allow)) {
        best = { allow: rule.allow, length };
      }
    }
  }
  return best ? best.allow : true;
}
