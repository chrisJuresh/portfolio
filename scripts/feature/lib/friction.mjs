/**
 * The friction log: every refusal these scripts hit, written down where the
 * cause can be fixed rather than worked around again next time.
 *
 * A denial costs the author tokens twice — once when it fires, and once more
 * when a later session rediscovers it. What a fix needs is four things: what was
 * attempted, which gate refused, the exact refusal, and the change that would
 * prevent it. An entry with three of them is a complaint.
 *
 * WHERE IT IS WRITTEN, and why it is not the worktree's copy. `feature land`
 * deletes the worktree it was run in. A denial hit while tearing down — the
 * remote branch delete being refused is the documented one — would be recorded
 * into a directory that is gone a second later. So the log flushed to is always
 * the MAIN checkout's, which is the one tree that outlives every feature, and
 * the flush happens after the pull so it cannot make that pull fail. Entries
 * arrive as an uncommitted change there, which is the point: they are meant to
 * be noticed.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Written once, at the top, so the format is stated where the entries are.
 *  #147 owns this file's prose; this is the minimum that makes it usable. */
export const HEADING = `# Friction log

Every refusal an agent or a script hits in this repository — a permission rule, a
\`PreToolUse\` hook, or the auto-mode classifier — recorded so the cause can be
fixed rather than worked around a second time. Append, never edit; delete an
entry only when the change it asks for has landed.

Four things, because a fix needs all four: **what was attempted**, **which gate
refused**, **the exact refusal**, and **the change that would prevent it**. The
gate matters most — the classifier is satisfied by an allow rule, a hook has to
be changed, and this repository's worktree guard is vendored from
\`chrisJuresh/skills\` and must be fixed upstream rather than here.
`;

/**
 * One entry, as markdown.
 *
 * @param {object} denial
 * @param {Date} denial.at
 * @param {string} denial.command the command that was running
 * @param {string} denial.what what was attempted
 * @param {string} denial.gate which gate refused
 * @param {string} denial.refusal the refusal, verbatim
 * @param {string} [denial.fix] the change that would prevent it
 * @returns {string}
 */
export function entry({ at, command, what, gate, refusal, fix }) {
  // Fenced, because a refusal is somebody else's output: git errors carry `#`,
  // `-` and backticks, and unfenced they become headings and list items.
  const quoted = String(refusal ?? '').replace(/\r\n/g, '\n').trimEnd();
  return [
    `## ${at.toISOString()} — \`${command}\``,
    '',
    `**Attempted**: \`${what}\``,
    '',
    `**Refused by**: ${gate}`,
    '',
    '```',
    quoted === '' ? '(the refusal carried no message)' : quoted,
    '```',
    '',
    `**Fix**: ${fix ?? 'not known — this entry is a question for the next session.'}`,
    '',
  ].join('\n');
}

/**
 * Append entries to the log, creating it with its heading if it is not there.
 *
 * @param {string} log absolute path
 * @param {string[]} entries as returned by `entry`
 */
export function flush(log, entries) {
  // The common case is none, and a log that grew an empty section on every clean
  // run is a file nobody reads.
  if (entries.length === 0) return;
  if (!existsSync(log)) {
    mkdirSync(dirname(log), { recursive: true });
    writeFileSync(log, HEADING, 'utf8');
  }
  appendFileSync(log, `\n${entries.join('\n')}`, 'utf8');
}
