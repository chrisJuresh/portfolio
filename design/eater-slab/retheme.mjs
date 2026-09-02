/* ============================================================================
   retheme.mjs — the re-theme, as three pure functions.

   The Slab is a dark map and Eater's own source draws a light one. The re-theme
   is how it becomes dark WITHOUT ANYTHING IN THE EATER CHECKOUT BEING EDITED:
   the modules its dev server serves are rewritten on their way to the browser,
   by the capture, from a declaration in slab.json.

   Nothing here touches a file, a socket or a browser. `capture-slab.mjs` owns
   all three; this owns the decisions, which is what makes them testable — and
   they are the decisions that most need to be, because the failure they guard
   against is silent. README.md, "The re-theme", says why it lives here.

   THREE FUNCTIONS, IN THE ORDER A RUN USES THEM
   ---------------------------------------------
   `planRetheme` turns the declaration into the rewrites it means, refusing a
   value that would not survive being inlined. `rewriteModule` applies the ones
   that claim a module to that module's text, counting each. `auditRetheme`
   reads every fetch back and says which rewrites did not get what they declared.

   The third is the one the whole file is for. A rewrite that quietly stops
   matching — Eater renames a function, protomaps moves a call site — writes a
   LIGHT Slab, and a light Slab on disk looks exactly like a right one until
   somebody opens it. That is the same argument `keep` and `strip` already make
   in the capture, and this is the same answer: declare what must be true, ask
   whether it was, and refuse.

   WHY EVERY MATCH IS COUNTED PER FETCH RATHER THAN TOTALLED
   ---------------------------------------------------------
   vite re-serves a module on an HMR round trip, so a run can be handed the same
   file twice. A total that only had to reach its count would let one good fetch
   cover for a bad one; every fetch has to agree on its own.
   ========================================================================== */

/**
 * A parameter, rendered for the JavaScript source it is pasted into.
 *
 * One rule, because there is one substitution: a string is itself, a number is
 * itself, and a list is an ALTERNATION — the `drop` ids go into a regex in
 * Eater's own layer filter, and `pois|address_label` is what that regex wants.
 *
 * @param {string | number | readonly string[]} value
 * @returns {string}
 */
export function renderValue(value) {
  return Array.isArray(value) ? value.join('|') : String(value);
}

/**
 * Is this value safe to paste into a module?
 *
 * Not a guard against hostile input — the declaration is the author's own file.
 * It is a guard against a TYPO, which would otherwise produce a module that
 * throws somewhere inside vite, minutes into a run, with nothing in the message
 * pointing back at the field that caused it. A stray quote in `flavor` closes
 * the call it lands in; a `.` in a `drop` id is a regex that matches more than
 * it says.
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
 * The rewrites a declaration means.
 *
 * A rewrite whose parameter still holds Eater's own value — `flavor` at
 * `"light"`, `drop` empty, `markerOpacity` unset — is NOT PLANNED, so nothing
 * matching its module is intercepted at all and the browser is handed the bytes
 * Eater served. That is what makes the whole device reversible by editing the
 * declaration: not "the rewrites happen to be no-ops" but "there are no
 * rewrites".
 *
 * @param {any} declared  slab.json's `retheme`, or nothing
 * @returns {Rewrite[]}
 */
export function planRetheme(declared) {
  if (!declared) return [];
  /** @type {Rewrite[]} */
  const plan = [];
  for (const rule of declared.rewrites ?? []) {
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
      replace: rule.replace.replaceAll('{value}', renderValue(value)),
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
 *
 * The replacement goes in through a FUNCTION rather than as a string, so it is
 * pasted literally: `String.replace` reads `$&`, `$'` and `$1` in a replacement
 * string, and the drop rewrite's replacement ends `$/.test(l.id))`. A `$` read
 * as a capture group would silently make the filter some other regex — which is
 * a light Slab under a dark declaration, which is the failure this file exists
 * to prevent.
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
 * Which rewrites did not get what they declared, one sentence each.
 *
 * Two kinds of disagreement, and the second is the one a total would hide: a
 * module that was SERVED and did not match, and a module that was never served
 * at all. Eater moving `style.js` somewhere else produces the second, and
 * without it the run would sail past with a rewrite that was never offered
 * anything to rewrite.
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
