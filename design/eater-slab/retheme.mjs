/* ============================================================================
   retheme.mjs — the re-theme's decisions, as pure functions.

   WHAT a re-theme is, WHY it lives here rather than in the Eater checkout, what
   each field of slab.json's `retheme` means, and the argument behind every
   refusal below are in README.md beside this, under "The re-theme". One home
   each: the comments below point at it rather than restating it, and carry only
   what is about this code.

   NOTHING HERE TOUCHES A FILE, A SOCKET OR A BROWSER, which is what makes it
   testable — `capture-slab.mjs` owns all three. In the order a run uses them:
   `planRetheme`, `rewriteModule`, `auditRetheme`, then `rethemeReport` and
   `rethemeHeld` for what the run says about it.
   ========================================================================== */

/**
 * A parameter, rendered for the JavaScript source it is pasted into — a list as
 * an ALTERNATION, because `drop` lands inside a regex in Eater's own layer
 * filter (README, "How each rewrite is declared").
 *
 * @param {string | number | readonly string[]} value
 * @returns {string}
 */
export function renderValue(value) {
  return Array.isArray(value) ? value.join('|') : String(value);
}

/**
 * Is this value safe to paste into a module? A guard against a TYPO and not
 * against hostile input — README, "How each rewrite is declared".
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function inlinable(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0 && value.every(inlinable);
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
}

/** Two declared values are the same one when they say the same thing. */
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Where `{value}` goes in a `replace`, and the reason a `replace` needs one. */
const SLOT = '{value}';

/**
 * Everything a rewrite has to say before it is worth planning, and what says it.
 * The order matters only in the message: the first thing wrong is the one named.
 *
 * @type {Array<[string, (given: any) => boolean, string]>}
 */
const FIELDS = [
  ['id', (given) => typeof given === 'string' && given.length > 0, 'a name, so a refusal can say which rewrite'],
  ['parameter', (given) => typeof given === 'string' && given.length > 0, "the name of the parameter it carries"],
  ['is', (given) => typeof given === 'string' && given.length > 0, 'what it does, for the report and the refusal'],
  ['module', (given) => typeof given === 'string' && given.length > 0, 'a regex for the module URLs it claims'],
  ['find', (given) => typeof given === 'string' && given.length > 0, 'a regex for what it replaces'],
  ['replace', (given) => typeof given === 'string' && given.includes(SLOT), `what it replaces them with, carrying ${SLOT}`],
  ['expect', (given) => Number.isInteger(given) && given > 0, 'how many times it must match, a whole number above zero'],
];

/**
 * Read a rewrite's whole entry, or refuse naming the rewrite and the field.
 * Here rather than in `auditRetheme`, and the `replace` check is not a shape
 * check — README, "How each rewrite is declared", says why for both.
 *
 * @param {any} rule
 * @returns {void}
 */
function readRewrite(rule) {
  const named = typeof rule?.id === 'string' && rule.id ? `the ${rule.id} rewrite` : 'a rewrite with no id';
  for (const [field, holds, wants] of FIELDS) {
    if (holds(rule?.[field])) continue;
    throw new Error(
      `${named} in slab.json's retheme declares ${field} as ${JSON.stringify(rule?.[field])}, ` +
        `and ${field} wants ${wants}.`,
    );
  }
  for (const field of ['module', 'find']) {
    try {
      new RegExp(rule[field]);
    } catch (error) {
      throw new Error(
        `${named}'s ${field} is not a regular expression — ${String(error?.message ?? error)}. ` +
          'Written here it is a refusal; left to be compiled later it is a run that never rewrites anything.',
      );
    }
  }
}

/**
 * @typedef {object} Rewrite
 * @property {string} id        which rewrite this is, in a report and in a refusal
 * @property {string} is        what it does, in the capture's own report
 * @property {string} value     the parameter it carries, rendered
 * @property {RegExp} module    the module URLs it claims
 * @property {RegExp} find      what it replaces in them, always global
 * @property {string} replace   what it replaces them with, pasted literally
 * @property {number} expect    how many times it must match, per fetch
 */

/**
 * The rewrites a declaration means. One whose parameter still holds Eater's own
 * value is NOT PLANNED at all, which is what makes the device reversible by
 * editing the declaration — README, "Reversing it".
 *
 * @param {any} declared  slab.json's `retheme`, or nothing
 * @returns {Rewrite[]}
 */
export function planRetheme(declared) {
  if (!declared) return [];
  /** @type {Rewrite[]} */
  const plan = [];
  for (const rule of declared.rewrites ?? []) {
    // Read whole, and read BEFORE the skip: a broken entry is broken whichever
    // way the parameters happen to be set today.
    readRewrite(rule);
    if (!(rule.parameter in declared)) {
      throw new Error(
        `the ${rule.id} rewrite carries a parameter called ${JSON.stringify(rule.parameter)}, ` +
          'and slab.json\'s retheme block does not declare one.',
      );
    }
    const value = declared[rule.parameter];
    if (value === undefined || same(value, rule.default)) continue;
    if (!inlinable(value)) {
      throw new Error(
        `retheme.${rule.parameter} is ${JSON.stringify(value)}, which is not something that can be pasted ` +
          'into a module. Words, numbers and lists of words only — anything else would land as a module ' +
          'that throws inside vite rather than as a refusal here.',
      );
    }
    plan.push({
      id: rule.id,
      is: rule.is,
      value: renderValue(value),
      module: new RegExp(rule.module),
      // Always global: the count is the whole point, and a non-global regex
      // caps every rewrite at one match and makes `expect: 2` unsatisfiable.
      find: new RegExp(rule.find, 'g'),
      replace: rule.replace.replaceAll(SLOT, renderValue(value)),
      expect: rule.expect,
    });
  }
  return plan;
}

/**
 * @typedef {{ id: string, count: number }} Found
 * @typedef {{ url: string, found: Found[] }} Served
 */

/**
 * One module's text, with every rewrite that claims it applied, and a count each.
 * The replacement goes in through a FUNCTION so it is pasted literally:
 * `String.replace` reads `$&`, `$'` and `$1`, and the drop rewrite's replacement
 * ends `$/.test(l.id))`, which read as a capture group would silently become
 * some other regex.
 *
 * @param {string} url
 * @param {string} source
 * @param {readonly Rewrite[]} plan
 * @returns {{ source: string, found: Found[] }}
 */
export function rewriteModule(url, source, plan) {
  /** @type {Found[]} */
  const found = [];
  let text = source;
  for (const rewrite of plan) {
    if (!rewrite.module.test(url)) continue;
    let count = 0;
    // `find` is global and is reused across fetches, which is safe: replace()
    // zeroes a global regex's lastIndex before it starts and after it finishes.
    text = text.replace(rewrite.find, () => {
      count += 1;
      return rewrite.replace;
    });
    found.push({ id: rewrite.id, count });
  }
  return { source: text, found };
}

/**
 * Which rewrites did not get what they declared, one sentence each. Two kinds of
 * disagreement: a module SERVED that did not match, and one never served at all.
 * README, "The three things it refuses on rather than getting wrong", says why
 * the second is a refusal rather than a vacuous pass.
 *
 * @param {readonly Rewrite[]} plan
 * @param {readonly Served[]} served  every fetch the run intercepted, in order
 * @returns {string[]}  empty when every count agrees
 */
export function auditRetheme(plan, served) {
  /** @type {string[]} */
  const refusals = [];
  for (const rewrite of plan) {
    const offered = served.filter((one) => one.found.some((got) => got.id === rewrite.id));
    if (offered.length === 0) {
      refusals.push(
        `the ${rewrite.id} rewrite was never served a module matching ${rewrite.module.source} — ` +
          'Eater has moved it, and the Slab would be the un-re-themed one.',
      );
      continue;
    }
    for (const one of offered) {
      const count = one.found.find((got) => got.id === rewrite.id)?.count ?? 0;
      if (count === rewrite.expect) continue;
      refusals.push(
        `the ${rewrite.id} rewrite expected ${rewrite.expect} match(es) in ${one.url} and found ${count} — ` +
          `${rewrite.is}. Eater's source has moved under it.`,
      );
    }
  }
  return refusals;
}

/**
 * What the run says it is about to do, before a browser is started. Printed
 * rather than summarised: the claim is "the Slab you are about to get is this
 * one", and "re-themed" alone sends its reader to slab.json.
 *
 * @param {readonly Rewrite[]} plan
 * @param {string} checkout
 * @returns {string[]}
 */
export function rethemeReport(plan, checkout) {
  if (plan.length === 0) return ["slab: no re-theme declared — Eater's own modules, unmodified"];
  const width = Math.max(...plan.map((one) => one.id.length));
  return [
    `slab: re-themed in flight; nothing in ${checkout} is edited`,
    ...plan.map((one) => `slab:   ${one.id.padEnd(width)}  ${one.value}  (x${one.expect}, ${one.is})`),
  ];
}

/**
 * And what it actually did, once the audit has passed. `null` for a run that
 * planned nothing, so the caller has nothing to print rather than a sentence
 * claiming a re-theme that was never attempted.
 *
 * @param {readonly Served[]} served
 * @returns {string | null}
 */
export function rethemeHeld(served) {
  if (served.length === 0) return null;
  const made = served.reduce((sum, one) => sum + one.found.reduce((n, got) => n + got.count, 0), 0);
  return `slab: re-theme held — ${made} substitution(s) over ${served.length} module fetch(es), every count as declared`;
}
