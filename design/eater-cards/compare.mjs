/**
 * What the generated files are, and what changed about them.
 *
 * Separated from vendor.mjs because this is the one part of that script whose
 * failure is SILENT. Everything else it does fails loudly and immediately — a
 * missing checkout, a dev server that will not come up, a route that never
 * finished — and the Agent Contract's rule is that those are not worth a
 * fixture. This is the opposite: if it wrongly said "unchanged", the Portfolio
 * would go on showing a version of the Eater app that no longer exists, and
 * nothing would ever say so. That is the whole guarantee #174 asked for, so it
 * is a pure function with a test beside it.
 */

/** The header every generated file carries, so a file opened on its own says
 *  where it came from and that editing it is pointless. */
export function stamp(kind, repo, eater) {
  const [open, close] = kind === 'css' ? ['/*', '*/'] : ['<!--', '-->'];
  return (
    `${open} GENERATED — do not edit.\n` +
    `   ${repo} @ ${eater.commit}\n` +
    `   ${eater.subject}\n` +
    `   node design/eater-cards/vendor.mjs --write ${close}\n`
  );
}

export const MANIFEST = 'cards.json';

/**
 * LF, whatever the app's own checkout uses.
 *
 * A CSS value can be several lines long — `--glass-rim` is three — and CSSOM
 * hands back the line breaks the source file had, so a CRLF checkout of the app
 * puts carriage returns inside the vendored stylesheet. Two of them, in this
 * case. That would make the output depend on how somebody's git is configured
 * rather than on what the app looks like, which is exactly the kind of
 * difference that makes the staleness report fire at a colleague for nothing.
 */
const lf = (text) => String(text).replace(/\r\n?/g, '\n');

/** Everything the export becomes on disk, by name. */
export function files(payload, eater, config) {
  const out = new Map();
  out.set(
    MANIFEST,
    `${JSON.stringify(
      {
        generator: 'design/eater-cards/vendor.mjs',
        eater: { repo: config.eater.repo, ...eater },
        restaurant: payload.restaurant,
        viewport: payload.viewport,
        host: payload.host,
        cards: payload.cards.map((card) => ({
          name: card.name,
          file: `${card.name}.html`,
          width: card.width,
          height: card.height,
        })),
      },
      null,
      2,
    )}\n`,
  );
  out.set('cards.css', `${stamp('css', config.eater.repo, eater)}\n${lf(payload.css)}`);
  for (const card of payload.cards) {
    out.set(`${card.name}.html`, `${stamp('html', config.eater.repo, eater)}${lf(card.html)}\n`);
  }
  return out;
}

/**
 * A generated file with the part that names a commit taken out of it.
 *
 * This is what separates "the app moved" from "the app's INTERFACE moved", and
 * the difference matters because every commit to that repository moves the stamp
 * whether it touched a surface or not. Without it the tool cries wolf on every
 * unrelated commit over there, and a tool that cries wolf is one whose report
 * gets skimmed — which is the failure this whole mechanism exists to prevent.
 */
export function withoutStamp(name, text) {
  if (typeof text !== 'string') return undefined;
  if (name.endsWith('.json')) {
    // JSON carries no comment, so the stamp is a field rather than a header.
    try {
      const held = JSON.parse(text);
      if (held?.eater) delete held.eater.commit, delete held.eater.subject;
      return JSON.stringify(held);
    } catch {
      return text;
    }
  }
  return text.replace(/^\s*(?:\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)\s*/, '');
}

const lines = (text) => text.split('\n').length;

/**
 * What moved between two sets of generated files.
 *
 * @returns {{ moved: string[], surfacesMoved: boolean, lines: string[] }}
 *   `moved` is empty when nothing changed at all. `surfacesMoved` is false when
 *   the only difference is the stamp.
 */
export function report(before, after, repo) {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  const moved = names.filter((name) => before.get(name) !== after.get(name));
  if (!moved.length) return { moved, surfacesMoved: false, lines: [] };

  const surfacesMoved = moved.some((name) => {
    const was = withoutStamp(name, before.get(name));
    const now = withoutStamp(name, after.get(name));
    return was === undefined || now === undefined || was !== now;
  });

  const said = [];
  const heldManifest = before.get(MANIFEST);
  let held = null;
  try {
    held = heldManifest ? JSON.parse(heldManifest).eater : null;
  } catch {
    held = null;
  }
  const now = after.get(MANIFEST) ? JSON.parse(after.get(MANIFEST)).eater : null;
  if (held && now && held.commit !== now.commit) {
    said.push(`  ${repo}  ${held.commit.slice(0, 8)} → ${now.commit.slice(0, 8)}`);
    said.push(`    was  ${held.subject}`);
    said.push(`    now  ${now.subject}`);
    said.push('');
  }
  if (!surfacesMoved) {
    said.push('  The surfaces themselves are identical — only the stamp moved.');
    said.push('');
  }
  for (const name of moved) {
    const was = before.get(name);
    const next = after.get(name);
    if (was === undefined) said.push(`  + ${name}  (${lines(next)} lines)`);
    else if (next === undefined) said.push(`  - ${name}`);
    else said.push(`  ~ ${name}  ${lines(was)} → ${lines(next)} lines, ${was.length} → ${next.length} bytes`);
  }
  return { moved, surfacesMoved, lines: said };
}
