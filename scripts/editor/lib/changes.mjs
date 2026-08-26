/**
 * The Recording: everything a session measured, as one document to paste to an
 * agent.
 *
 * WHAT IT IS FOR, AND WHY IT IS NOT `annotate()` AGAIN. An Annotation is one
 * element's instruction and it is written to be read on its own — the paragraph
 * about the promotion, the paragraph about the glossary, the paragraph about
 * relationships, all of it, every time. That is right for one element and wrong
 * for twenty: "resize a whole load of different elements, then paste the
 * recording" produces eight hundred lines in which the same four paragraphs appear
 * twenty times, and the numbers — the only part that differs — are what gets lost
 * in it. So this is the SAME FACTS at session scale: the caveats said once at the
 * top, one compact block per element, and the standing prose folded into a footer.
 *
 * IT TAKES `measurement()`'S OWN RECORDS. Every entry is exactly what
 * `client/measure.js` hands `annotate()`, so there is no second measurement, no
 * second idea of what a share of a parent is, and nothing here that can disagree
 * with the Annotation about the same element. `figure`, `px`, `list`, `AXES` and
 * `TEXT` come from `lib/annotations.mjs` for the same reason: how a number is
 * written here is one decision, made once.
 *
 * ONLY WHAT MOVED. An axis with a zero delta is not in the block. An Annotation
 * prints all four because it is describing one box and the numbers that did not
 * move are context; a recording of twenty elements printing eighty axes to say
 * something about nineteen of them is a worse document, and the "was" column
 * carries the context anyway.
 *
 * WRITTEN AND MEASURED ARE KEPT APART, and that is the one thing in this format
 * that prevents a wrong answer rather than a long one. The Measure surface writes
 * a Token when a scrubbed row has one behind it, so by the time a session is
 * pasted some of its changes are ALREADY IN THE SOURCE. An agent handed one flat
 * list would apply those twice — and the second application is arithmetic on a
 * number that has already moved, so it is silently wrong rather than a no-op. The
 * written ones get their own section, under a heading that says not to.
 *
 * IT SAYS WHEN THE MEASUREMENTS COMPOSE. With `keep` on, a change stays on the
 * page as the next element is picked — so something measured inside something that
 * was already enlarged was measured against the enlarged one. That is what the
 * author wanted to look at, and it is also a fact about the numbers, so it is
 * stated once at the top rather than left for an agent to work out.
 *
 * IT IS PURE SO IT CAN BE TESTED, like `lib/annotations.mjs`: plain records in,
 * plain text out, no DOM and no node imports.
 */

import { AXES, TEXT, figure, holderFile, list, px } from './annotations.mjs';

/** Which of the parent's two sides each axis is a share of. The same table
 *  `annotate()` keeps, for the same column. */
const ALONG = { left: 'width', width: 'width', top: 'height', height: 'height' };

/** The five things a block can report, in the order they are reported. */
const MEASURES = [...AXES, TEXT];

/** The width of the report, which is the width `annotate()` wraps to — so an
 *  Annotation and a Recording pasted into the same terminal line up. */
const WIDTH = 88;

/** A hundredth of a pixel, because that is what `px()` prints to: a delta that
 *  rounds away would take a row in the block and report `+0px` in it. */
const NOTHING = 0.005;

const signed = (n) => `${n > 0 ? '+' : '-'}${px(Math.abs(n))}`;

/** A row of cells at fixed columns, with the last one left to run on. */
const columns = (cells, widths) =>
  cells
    .map((cell, at) => (at === cells.length - 1 ? String(cell) : String(cell).padEnd(widths[at])))
    .join('')
    .trimEnd();

/** A paragraph, indented and wrapped to the report's width. `annotate()`'s own,
 *  with the indent as an argument because a footer and a token line want
 *  different ones. */
function paragraph(text, indent = '  ') {
  const lines = [];
  let line = indent;
  for (const word of String(text).split(' ')) {
    if (line.trim() !== '' && line.length + 1 + word.length > WIDTH) {
      lines.push(line);
      line = indent;
    }
    line += line.trim() === '' ? word : ` ${word}`;
  }
  if (line.trim() !== '') lines.push(line);
  return lines;
}

/**
 * What one measurement changed: the axes with a delta, and the text size where it
 * has one.
 *
 * @param {object} measured  a `measurement()` record
 * @returns {string[]} the axis names that moved, `TEXT` included where it did
 */
export function moved(measured) {
  const changed = [];
  for (const axis of AXES) {
    if (Math.abs((measured.after?.[axis] ?? 0) - (measured.before?.[axis] ?? 0)) >= NOTHING) {
      changed.push(axis);
    }
  }
  const text = measured.text ?? null;
  if (text && Math.abs(text.after - text.before) >= NOTHING) changed.push(TEXT);
  return changed;
}

/** The one-line headline a panel row shows, which is the same sentence the block
 *  is titled with. */
export function headline(entry) {
  const changed = moved(entry.measured);
  if (changed.length === 0) return `${entry.measured.named.phrase} — measured, and nothing moved`;
  const said = changed.map((axis) =>
    axis === TEXT
      ? `text size to ${px(entry.measured.text.after)}`
      : `${axis} ${signed(entry.measured.after[axis] - entry.measured.before[axis])}`,
  );
  return `${entry.measured.named.phrase} — ${list(said)}`;
}

/**
 * One element's block.
 *
 * `written` is the session's list, and the mark on an axis is DERIVED from it
 * rather than stored on the entry. Stored, it was a fact about the order two calls
 * happened in — record the measurement, write, mark the axis — and one extra
 * `change` event from a number box was enough to reverse them and drop the mark off
 * a line that had in fact been written. Derived, the question is the one that
 * actually matters and it has one answer whenever it is asked: does the Token this
 * line names already hold the value this line asks for? Two elements governed by
 * the same Token are both marked, which is right — the Token holds it, so neither
 * should be applied again.
 */
function block(entry, at, written = []) {
  const { measured, scaled } = entry;
  const { named, before, after, parent, text } = measured;
  const changed = moved(measured);
  const lines = [`${at}. ${named.phrase}`, columns(['   on the page', measured.selector], [15])];
  if (parent?.phrase) {
    lines.push(columns(['   inside', `${parent.phrase}, ${px(parent.width)} × ${px(parent.height)}`], [15]));
  }
  lines.push('');

  if (changed.length === 0) {
    lines.push('   nothing moved — it was picked and measured, and that is all.');
    return lines;
  }

  lines.push(columns(['   axis', 'from', 'to', 'delta', 'share'], [15, 12, 12, 12]));
  for (const axis of MEASURES) {
    if (!changed.includes(axis)) continue;
    const isText = axis === TEXT;
    const from = isText ? text.before : before[axis];
    const to = isText ? text.after : after[axis];
    // A text size's share is of the ROOT and not of the parent's box: that is the
    // unit a type ladder is written in, and whether this size is in `rem` or in
    // `px` is the change an agent has to make. A box's share is of the parent,
    // because that is what these compositions are written in.
    const base = isText ? measured.root : parent?.[ALONG[axis]];
    const share =
      base > 0
        ? `${figure(from / base, 3)} → ${figure(to / base, 3)}${isText ? ' × root' : ''}`
        : '';
    lines.push(columns([`   ${axis}`, px(from), px(to), signed(to - from), share], [15, 12, 12, 12]));
  }

  // WHOSE TEXT IT IS, where it is not this element's own. A box that draws no words
  // itself has an inherited size that governs nothing, so the row above was read off
  // what is inside it — and an agent handed this document has to make the change on
  // that rule rather than on this box, where a font-size would be read by nothing.
  if (changed.includes(TEXT) && text?.own === false) {
    lines.push(
      '',
      ...paragraph(
        `This element draws no words of its own: the text size above is the one the elements inside it are` +
          ` set at${text.on ? `, by ${text.on}` : ''}, which is where it was read from and where it belongs.`,
        '   ',
      ),
    );
  }

  if (scaled) {
    lines.push(
      '',
      ...paragraph(
        `The text size here was not scrubbed — it followed the box, because "scale text" was on:` +
          ` ×${figure(scaled.by, 3)}, the smaller of the two ratios the resize made. It is the ratio` +
          ' between this box and its type that was held, which is what to keep when you fold this in.',
        '   ',
      ),
    );
  }

  if (measured.promoted) {
    lines.push(
      '',
      ...paragraph(
        'This is a non-replaced inline box, so width, height and translate do not apply to it at all.' +
          ' It was measured as display: inline-block, so the numbers above describe a box the page does' +
          ' not currently make — whatever change is made has to decide whether that promotion is part' +
          ' of it.',
        '   ',
      ),
    );
  }

  const said = measured.tokens ?? [];
  // Marked ON THE AXIS and not only in the list at the foot of the document,
  // because that list is a list of Tokens and this is a list of axes: an element
  // whose width landed and whose height did not is exactly the case an agent has
  // to get right, and "one of these two is already done" is not something a reader
  // should have to reconstruct by matching a custom property against a block.
  const already = (token) =>
    written.some((one) => one.kind === 'token' && one.what === token.token && one.value === token.wants);
  if (said.length > 0) lines.push('');
  for (const token of said) {
    if (token.wants !== null && token.section !== null) {
      lines.push(
        `   ${token.axis} is ${token.token} — ${token.was} → ${token.wants}` +
          `${already(token) ? '   [ALREADY WRITTEN — do not apply again]' : ''}`,
        `        on ${token.selector} in ${holderFile(token.section)}`,
      );
    } else {
      lines.push(
        ...paragraph(
          `${token.axis} is set by ${token.property}: ${token.was} on ${token.selector}, and that is` +
            ` not a Token the Editor can write — ${token.why ?? 'it is a relationship rather than a length'}.`,
          '   ',
        ),
      );
    }
  }
  const unsaid = changed.filter((axis) => !said.some((token) => token.axis === axis));
  if (unsaid.length > 0) {
    lines.push(
      ...paragraph(
        `Nothing the Editor can see declares ${list(unsaid)} here, so ${unsaid.length === 1 ? 'that one is' : 'those are'}` +
          ' a change to the composition rather than a value to write.',
        '   ',
      ),
    );
  }
  return lines;
}

/**
 * The whole session as one document.
 *
 * @param {object} session
 * @param {Array<{ measured: object, scaled: ({ by: number }|null) }>} session.entries
 *   one per element, in the order they were first measured
 * @param {Array<{ kind: 'token'|'override', what: string, value: string, file: string,
 *                 where: string }>} session.written  what already reached a file
 * @param {{ width: number, height: number }} [session.viewport]
 * @param {number} [session.root]  the root font-size, in px
 * @param {boolean} [session.kept]  whether changes were left standing on the page
 *   as the next element was picked, which is what makes later measurements compose
 * @param {string} [session.at]  when it was taken, as the author's clock reads it
 * @returns {string}
 */
export function report(session) {
  const entries = session.entries ?? [];
  const written = session.written ?? [];
  if (entries.length === 0 && written.length === 0) {
    return 'Nothing has been measured yet. Pick something on the Measure surface and move it.\n';
  }

  const viewport = session.viewport ?? entries[0]?.measured?.viewport ?? null;
  const root = session.root ?? entries[0]?.measured?.root ?? null;

  const lines = ['MEASURED CHANGES FROM THE PORTFOLIO EDITOR'];
  const measuredAt = [
    session.at ? `taken ${session.at}` : null,
    viewport ? `viewport ${figure(viewport.width, 0)}×${figure(viewport.height, 0)}` : null,
    root ? `root font-size ${px(root)}` : null,
  ].filter(Boolean);
  if (measuredAt.length > 0) lines.push(measuredAt.join(', '));
  lines.push(
    `${entries.length} element${entries.length === 1 ? '' : 's'} measured` +
      `${written.length > 0 ? `, and ${written.length} value${written.length === 1 ? '' : 's'} already written` : ''}.`,
  );
  lines.push('');
  lines.push(
    ...paragraph(
      'These are numbers read off the page and not an instruction to hard-code them. These' +
        ' compositions are held together by relationships rather than coordinates, so for each block' +
        ' below the question is which constant moved — not where to put a translate. Where a line' +
        ' names a Token, that Token is the change. Where nothing is named, the length is a literal in' +
        ' the composition and promoting it to a Token is the change (ADR 0004).',
    ),
  );
  if (session.kept) {
    lines.push(
      '',
      ...paragraph(
        'These were kept on the page as they were made, so they COMPOSE: anything measured inside' +
          ' something earlier in this list was measured with that earlier change already standing.' +
          ' The blocks are in the order they were first measured.',
      ),
    );
  }

  for (const [at, entry] of entries.entries()) {
    lines.push('', '-'.repeat(WIDTH), '', ...block(entry, at + 1, written));
  }

  if (written.length > 0) {
    lines.push('', '='.repeat(WIDTH), '');
    lines.push(
      ...paragraph(
        'ALREADY WRITTEN — do not apply these again. The Editor wrote each of them when a scrubbed row' +
          ' turned out to have a Token behind it, or when an Override was asked for. Applying one a' +
          ' second time is arithmetic on a number that has already moved, so it is silently wrong' +
          ' rather than a no-op.',
      ),
    );
    lines.push('');
    for (const one of written) {
      lines.push(`   ${one.what} = ${one.value}`);
      lines.push(`        ${one.file}${one.where ? ` — ${one.where}` : ''}`);
    }
    if (written.some((one) => one.kind === 'override')) {
      lines.push(
        '',
        ...paragraph(
          'An Override is debt by construction: it is a value standing outside every composition,' +
            ' declared !important so it outranks the rule it argues with. Folding it into the Section' +
            ' it belongs to and deleting it from src/overrides.css is part of the work.',
        ),
      );
    }
  }

  const nameless = [
    ...new Set(
      entries
        .filter((entry) => entry.measured.named?.vocabulary === false && entry.measured.named?.part)
        .map((entry) => entry.measured.named.part),
    ),
  ];
  if (nameless.length > 0) {
    lines.push('', '='.repeat(WIDTH), '');
    lines.push(
      ...paragraph(
        `The glossary in CONTEXT.md has no word for ${list(nameless)}, so ${nameless.length === 1 ? 'it is named after its own class' : 'those are named after their own classes'}` +
          ' above. If any of them deserves a term, that file is where one goes — and every sentence the' +
          ' Editor writes about it gets better for free.',
      ),
    );
  }

  return `${lines.join('\n')}\n`;
}
