import { defineContent, z } from '../../kernel/content';

/**
 * The Projects Panel's Content, and its schema.
 *
 * Every word the Section draws is here. The Rail's are not: it is one piece of
 * furniture standing on the page rather than a thing this Section draws (#192),
 * so its words are the Kernel's — src/kernel/rail/content.ts. NOTES.md says
 * where each of these came from and what was cut.
 */
const schema = z.object({
  /** The Section's accessible name, and the word the Cut Title stands in for. */
  masthead: z.string().min(1),
  /**
   * Two authored lines, not one string left to wrap. Where the break falls is
   * part of the composition — the second line is the one the Frame passes in
   * front of — so it is authored rather than a consequence of the column's width.
   */
  subheading: z.tuple([z.string().min(1), z.string().min(1)]),
  copy: z.array(z.string().min(1)).min(1),
  /**
   * The Frame's address field. Content and not a Token, because it is a fact
   * about the project rather than a length: the photos site binds to loopback
   * and is never deployed, so the only address that is not an invention is the
   * one the recording was actually served from. The render's own field is empty —
   * it was captured with no chrome — so there was nothing here to measure and
   * this is authored.
   */
  frame: z.object({ address: z.string().min(1) }),
  /** In the Career Record's own ranking, which is why the markup is an <ol>. */
  points: z
    .array(
      z.object({
        title: z.string().min(1),
        figure: z.string().min(1),
      }),
    )
    .min(1),
});

export type ProjectsPanelContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  masthead: 'Projects',
  subheading: ['Self-stacking', 'photo gallery'],
  frame: { address: '127.0.0.1:8770' },
  copy: [
    'Twenty years of photographs had turned into 1,374,328 file paths across ' +
      'overlapping backups. This is the system that turned them into one immutable ' +
      'content-addressed vault and a website that browses it. When the shipped ' +
      'result disagreed with what I actually wanted, the objective moved and the ' +
      'reasoning that produced the old one stayed on the page.',
  ],
  points: [
    {
      title: 'Label-driven calibration',
      figure: '96.5% precision, 85.6% recall — measured, not chosen',
    },
    {
      title: 'Screen-then-verify matcher',
      figure: '3,632,211 candidate pairs, screened to 566,522',
    },
    {
      title: 'Ledger-backed delete gate',
      figure: '435.6 GB re-hashed and reconciled both ways',
    },
    {
      title: 'Triage rule engine',
      figure: '1,374,328 paths re-costed in 220 ms',
    },
  ],
});
