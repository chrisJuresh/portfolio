/**
 * How long a Token says something takes, in seconds.
 *
 * ONE READING OF A DURATION AND NOT TWO, which is the whole of why this is a file
 * rather than four lines at the top of the module that needed it first. The Lift
 * reads `--eater-map-lift-time` and the Drop reads `--eater-map-drop-time`, and
 * both are Tokens the author drags — so both have to be read PER GESTURE rather
 * than at mount, and both have to accept the two spellings a duration has in CSS.
 * Written twice that is one rule with two implementations, and the failure —
 * `250ms` read as two hundred and fifty seconds — is a Section that appears to
 * have stopped moving.
 *
 * IT PARSES BECAUSE A CUSTOM PROPERTY'S COMPUTED VALUE IS ITS TOKEN STREAM.
 * `getPropertyValue` hands back `1.15s`, not a number and not milliseconds; there
 * is no way to ask the engine to resolve one to a time. The leader lines meet the
 * same fact from the other side and answer it the other way — a LENGTH a script
 * needs in pixels is spent by the stylesheet on a real property first, because a
 * length has units the author may change under it. A duration has two spellings
 * and nothing else, so it is cheaper to read than to spend.
 */

/** A duration Token, in seconds, written in either `s` or `ms`. */
export function seconds(raw: string, fallback: number): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.trim().endsWith('ms') ? value / 1000 : value;
}
