/* ============================================================================
   rows.mjs — the results dropdown's row cap, as pure functions.

   WHAT it is, WHY the panel has to be capped at all, and why the cap is applied
   to the module Eater's dev server serves rather than to the Eater checkout are
   in README.md beside this, under "The fourth surface". One home each: the
   comments below carry only what is about this code.

   WHY IT IS A SEAM. A four-row card on disk looks exactly like a two-row one —
   the same file, of the same app, of the same restaurants, at the wrong height —
   and nothing downstream would ever say so. That is the same argument #188 makes
   for the Slab's re-theme and the same one `compare.mjs` makes for staleness, and
   it is the only thing in this folder that earns a fixture: everything else here
   fails loudly and immediately.

   NOTHING HERE TOUCHES A FILE, A SOCKET OR A BROWSER — `vendor.mjs` owns all
   three. In the order a run uses them: `planRowCap`, `capModule`, `auditRowCap`,
   then `rowCapReport` for what the run says about it.
   ========================================================================== */

/** Where `{value}` goes in a `replace`, and the reason a `replace` needs one. */
const SLOT = '{value}';

/**
 * Everything the cap has to say before it is worth planning, and what says it.
 * The order matters only in the message: the first thing wrong is the one named.
 *
 * @type {Array<[string, (given: any) => boolean, string]>}
 */
const FIELDS = [
  ['id', (given) => typeof given === 'string' && given.length > 0, 'a name, so a refusal can say which rewrite'],
  ['is', (given) => typeof given === 'string' && given.length > 0, 'what it does, for the report and the refusal'],
  ['module', (given) => typeof given === 'string' && given.length > 0, 'a regex for the module URLs it claims'],
  ['find', (given) => typeof given === 'string' && given.length > 0, 'a regex for what it replaces'],
  ['replace', (given) => typeof given === 'string' && given.includes(SLOT), `what it replaces them with, carrying ${SLOT}`],
  ['expect', (given) => Number.isInteger(given) && given > 0, 'how many times it must match, a whole number above zero'],
];

/**
 * @typedef {object} RowCap
 * @property {string} id       which rewrite this is, in a report and in a refusal
 * @property {string} is       what it does, in the capture's own report
 * @property {number} rows     how many rows the panel is to show at once
 * @property {RegExp} module   the module URLs it claims
 * @property {RegExp} find     what it replaces in them, always global
 * @property {string} replace  what it replaces them with, pasted literally
 * @property {number} expect   how many times it must match, per fetch
 */

/**
 * The rewrite a `results` declaration means, or `null` for a run that is not
 * taking a fourth surface at all — which is what makes the whole device
 * reversible by deleting a block rather than by editing a script.
 *
 * A declaration that is PRESENT and wrong is a throw and not a null: the two are
 * "no fourth card was asked for" and "one was asked for and cannot be taken",
 * and reporting the second as the first is how a run comes to write three cards
 * while reading as though it wrote four.
 *
 * @param {any} declared  config.json's `results`, or nothing
 * @returns {RowCap | null}
 */
export function planRowCap(declared) {
  if (!declared) return null;
  if (!Number.isInteger(declared.rows) || declared.rows <= 0) {
    throw new Error(
      `results.rows in config.json is ${JSON.stringify(declared.rows)}, and it wants a whole number of ` +
        'rows above zero — it is pasted into a module, and anything else lands as a module that throws ' +
        'inside vite rather than as a refusal here.',
    );
  }
  const rule = declared.cap;
  const named = typeof rule?.id === 'string' && rule.id ? `the ${rule.id} rewrite` : 'the cap with no id';
  for (const [field, holds, wants] of FIELDS) {
    if (holds(rule?.[field])) continue;
    throw new Error(
      `${named} in config.json's results declares ${field} as ${JSON.stringify(rule?.[field])}, ` +
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
  return {
    id: rule.id,
    is: rule.is,
    rows: declared.rows,
    module: new RegExp(rule.module),
    // Always global: the count is the whole point, and a non-global regex caps
    // every rewrite at one match and cannot tell one call site from two.
    find: new RegExp(rule.find, 'g'),
    replace: rule.replace.replaceAll(SLOT, String(declared.rows)),
    expect: rule.expect,
  };
}

/**
 * @typedef {{ url: string, count: number }} Served
 */

/**
 * One module's text, with the cap applied and a count of how many times it
 * matched. `count` is `null` for a module the cap does not claim, which is the
 * difference between "this fetch was not its business" and "it found nothing".
 *
 * The replacement goes in through a FUNCTION so it is pasted literally:
 * `String.replace` reads `$&`, `$'` and `$1` out of a replacement string, so a
 * `replace` that ever grew one of those would silently become something else.
 *
 * @param {string} url
 * @param {string} source
 * @param {RowCap | null} plan
 * @returns {{ source: string, count: number | null }}
 */
export function capModule(url, source, plan) {
  if (!plan || !plan.module.test(url)) return { source, count: null };
  let count = 0;
  // `find` is global and is reused across fetches, which is safe: replace()
  // zeroes a global regex's lastIndex before it starts and after it finishes.
  const text = source.replace(plan.find, () => {
    count += 1;
    return plan.replace;
  });
  return { source: text, count };
}

/**
 * What the cap did not get, one sentence each, and empty when every count
 * agrees. Two kinds of disagreement, and the second is the one worth the branch:
 * a module SERVED that did not match, and one never served at all — a rename in
 * Eater is the first, a move is the second, and a run that treated the second as
 * nothing to report would write a four-row card and say it wrote a two-row one.
 *
 * EVERY FETCH HAS TO AGREE, not the total: vite re-serves a module on an HMR
 * round trip, and a sum that only had to reach its count would let one good
 * fetch cover for a bad one.
 *
 * @param {RowCap | null} plan
 * @param {readonly Served[]} served  every fetch the run intercepted, in order
 * @returns {string[]}
 */
export function auditRowCap(plan, served) {
  if (!plan) return [];
  const offered = served.filter((one) => Number.isInteger(one.count));
  if (offered.length === 0) {
    return [
      `the ${plan.id} rewrite was never served a module matching ${plan.module.source} — Eater has moved ` +
        "it, and the dropdown would be the app's own uncapped panel inside a host box sized for " +
        `${plan.rows}.`,
    ];
  }
  /** @type {string[]} */
  const refusals = [];
  for (const one of offered) {
    if (one.count === plan.expect) continue;
    refusals.push(
      `the ${plan.id} rewrite expected ${plan.expect} match(es) in ${one.url} and found ${one.count} — ` +
        `${plan.is}. Eater's source has moved under it.`,
    );
  }
  return refusals;
}

/**
 * What the run says it is about to do, before a browser is started. Printed
 * rather than summarised, for the reason `rethemeReport` is: the claim is "the
 * card you are about to get is this one", and "capped" alone sends its reader to
 * config.json.
 *
 * @param {RowCap | null} plan
 * @param {string} checkout
 * @returns {string[]}
 */
export function rowCapReport(plan, checkout) {
  if (!plan) return ['eater-cards: no results dropdown declared — three surfaces, off /export alone'];
  return [
    `eater-cards: the dropdown is capped in flight; nothing in ${checkout} is edited`,
    `eater-cards:   ${plan.id}  ${plan.rows}  (x${plan.expect}, ${plan.is})`,
  ];
}
