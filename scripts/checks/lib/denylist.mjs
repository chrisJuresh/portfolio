/**
 * The shapes a Section's words may not have.
 *
 * WHY THESE ARE SHAPES AND NOT NAMES. The thing being guarded against is a
 * client, a colleague, a hostname or a ticket key reaching the Portfolio from the
 * private Career Record. A denylist of the actual names would put every one of
 * them in a public repository, which is the leak it exists to prevent. So the
 * patterns here are the shapes that cannot be legitimate on a personal
 * portfolio, and the names live in `denylist.local.txt` beside this file, which
 * `.gitignore` keeps out of the repository. NOTES.md carries the rest, including
 * why there is no pattern for an email address.
 *
 * `scan` is pure and its tests are beside it; the Check that uses it is in
 * ../checks/unpublishable.mjs.
 */

/**
 * Prefixes that make a ticket key a standards reference instead. Every one of
 * these is a phrase a portfolio legitimately writes, and a blocking Check that
 * fired on one would cost the author a prompt — which is the single cost ADR 0006
 * says the suite may not impose. Add to this list rather than loosening the
 * pattern.
 */
const NOT_A_TICKET = new Set([
  'ADR',
  'AES',
  'ARIA',
  'AVIF',
  'CSS',
  'EN',
  'ES',
  'HTTP',
  'IEEE',
  'ISO',
  'JPEG',
  'MPEG',
  'RFC',
  'SHA',
  'UTF',
  'WCAG',
]);

/** @typedef {{ name: string, why: string, pattern: RegExp, allow?: (match: string) => boolean }} Pattern */

/** @type {Pattern[]} */
export const PATTERNS = [
  {
    name: 'ticket-key',
    why: 'reads as an issue key from a tracker that is not this one',
    // Two or more digits, so `UTF-8` and `HTTP-2` are not keys by construction
    // and only a standards number with three or more needs the allowlist.
    pattern: /\b[A-Z][A-Z0-9]{1,9}-\d{2,6}\b/g,
    allow: (match) => NOT_A_TICKET.has(match.split('-')[0]),
  },
  {
    name: 'internal-host',
    why: 'a hostname on a private network',
    pattern: /\b[a-z0-9][a-z0-9-]*\.(?:internal|local|localdomain|corp|intra|intranet|lan)\b/gi,
  },
  {
    name: 'private-ip',
    why: 'an address on a private network',
    pattern:
      /\b(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/g,
  },
  {
    name: 'credential',
    why: 'the shape of an access key or a private key',
    // Case-SENSITIVE, and split from the `arn:` pattern below for that reason
    // alone: these shapes are upper case by definition, and an /i on them makes
    // twenty lower-case letters after "akia" a credential.
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: 'cloud-resource',
    why: 'the name of a cloud resource, which is infrastructure and not a portfolio',
    pattern: /\barn:aws[\w-]*:[\w-]*:/gi,
  },
  {
    name: 'record-internal',
    why: "a field or repository name from the private Career Record, so the words came from its unpublishable half",
    pattern: /\bMASTER_RECORD\b|\bcareer-record\b|\bevidence\s*:/gi,
  },
  {
    name: 'marked-private',
    why: 'text the source marked as not for publication',
    pattern: /\bCONFIDENTIAL\b|\bINTERNAL[ -]ONLY\b|\bDO NOT (?:PUBLISH|CIRCULATE|SHARE)\b|\bNDA\b/gi,
  },
];

/** Escape a literal term so punctuation in a name is matched rather than parsed. */
function literal(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The author's own terms — clients, colleagues, hostnames, anything a pattern
 * cannot describe — one per line, `#` for a comment.
 *
 * Bounded on both sides so a term cannot fire on a substring of an ordinary
 * word: `Ford` in the file does not match "afford". The boundary is a lookaround
 * rather than `\b` because a term may legitimately begin or end with punctuation,
 * where `\b` sits on the wrong side of the character and never matches.
 *
 * @param {string} contents @returns {Pattern[]}
 */
export function localPatterns(contents) {
  return String(contents ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((term) => ({
      name: 'local-term',
      why: 'a term denylist.local.txt marks as unpublishable',
      pattern: new RegExp(`(?<![\\w])${literal(term)}(?![\\w])`, 'gi'),
    }));
}

/**
 * Every distinct match of every pattern, with where it was found and why it is
 * one. Distinct rather than every occurrence: a term repeated four times is one
 * thing to fix, and a Check's report is read by whoever has to fix it.
 *
 * @param {string | null | undefined} text @param {Pattern[]} patterns
 * @returns {{ name: string, why: string, match: string, at: number }[]}
 */
export function scan(text, patterns) {
  const haystack = String(text ?? '');
  if (haystack.length === 0) return [];

  /** @type {{ name: string, why: string, match: string, at: number }[]} */
  const hits = [];
  const seen = new Set();

  for (const { name, why, pattern, allow } of patterns) {
    // A fresh RegExp per scan: the module-level ones carry /g, and a shared
    // lastIndex between calls would make a second scan skip the front of its
    // text — silently, and only sometimes.
    for (const found of haystack.matchAll(new RegExp(pattern.source, pattern.flags))) {
      const match = found[0];
      if (allow?.(match)) continue;
      const key = JSON.stringify([name, match]);
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ name, why, match, at: found.index ?? 0 });
    }
  }

  return hits;
}
