import { defineContent, z } from '../../kernel/content';
import { PARTS } from './leaders';

/**
 * The Eater Map Section's Content, and its schema.
 *
 * Every word the Section draws is here, including the two the Rail speaks and
 * never prints and the one word standing where the Slab will go. NOTES.md says
 * where the copy came from and what was cut out of it.
 */
const schema = z.object({
  /**
   * The Section's accessible name, and the masthead it prints — which is
   * PROJECTS, the Gallery's own word in the Gallery's own box (#191).
   *
   * A plain word rather than a Cut Title: #172 measured what a second one would
   * cost. It stands where the Panel's masthead stands so the two screens read as
   * one place, and it is still THIS Section's element — #193 is what makes the
   * page's PROJECTS one persistent thing, and this slot is what that ticket takes
   * over.
   */
  masthead: z.string().min(1),
  /**
   * The serif project title, in four authored lines rather than one string left
   * to wrap. Where the break falls is part of the composition rather than a
   * consequence of the column's width — the Projects Panel's rule, and this
   * Section's for the same reason: the lines are set solid under a masthead they
   * have to sit square with.
   *
   * FOUR AND NOT TWO (#191). At the size the reference sets this — 0.566 of
   * PROJECTS' cap — the two lines this Section shipped with do not fit the
   * column, and four is the reference's own block.
   */
  title: z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
  ]),
  rail: z.object({
    /** The landmark's name. Spoken, never drawn. */
    label: z.string().min(1),
    /** Said after a project with no Section of its own. Grey says it to anything
     *  looking; this says it to anything listening. */
    unbuilt: z.string().min(1),
    /**
     * An entry is a route if it holds a link, and the fragment already names the
     * Section, so no attribute has to. `#eater-map` is this Section's own, which
     * is what marks this entry current here — ADR 0007.
     */
    projects: z
      .array(
        z.object({
          name: z.string().min(1),
          href: z.string().min(1).optional(),
        }),
      )
      .min(1),
  }),
  copy: z.array(z.string().min(1)).min(1),
  /**
   * The Exploded View's own words, which are one sentence: what the Slab is a
   * picture of.
   *
   * It is `alt` on a photograph of a map, so it says what a reader looking at it
   * would see and stops — a screen reader gets the four numbered points for what
   * the map is FOR, and repeating them here would be reading the Section twice.
   *
   * The Cards' words are NOT here and are not Content. They are the Eater app's
   * own, exported rather than redrawn, and the Editor must not offer a way to
   * rewrite another repository's interface from this page. NOTES.md.
   */
  stage: z.object({ slabAlt: z.string().min(1) }),
  /**
   * Each one names a part of the Exploded View, and a leader line joins it to
   * that part (#178). An <ol> because the numbers are read.
   *
   * `part` is the correspondence itself, and the two refinements under it are
   * what make it exact rather than intended: **no part without a number and no
   * number without a part.** They are a build failure and not a Check because a
   * point naming nothing draws no line at all, which is a hole in the drawing
   * rather than something that looks wrong.
   *
   * It is a field of the Content and not a list somewhere else for one reason:
   * a point and the part it names are one decision, and splitting them across
   * two files is how the two get out of step. The Editor never offers it — it
   * matches an element against the words it DRAWS, and this is drawn nowhere.
   */
  points: z
    .array(
      z.object({
        title: z.string().min(1),
        figure: z.string().min(1),
        part: z.enum(PARTS),
      }),
    )
    .min(1)
    .superRefine((points, ctx) => {
      const named = points.map((point) => point.part);
      for (const part of PARTS) {
        if (!named.includes(part)) {
          ctx.addIssue({
            code: 'custom',
            message: `no point names the ${part} — every part of the Exploded View carries a number`,
          });
        }
      }
      for (const part of new Set(named.filter((name, at) => named.indexOf(name) !== at))) {
        ctx.addIssue({
          code: 'custom',
          message: `two points name the ${part} — a part carries one number and one line`,
        });
      }
    }),
});

export type EaterMapContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  masthead: 'Projects',
  title: ['Every Eater', 'guide in', 'London on', 'one map'],
  rail: {
    label: 'Projects',
    unbuilt: ' — no page yet',
    projects: [
      { name: 'Photo Vault', href: '#projects' },
      { name: 'Eater Map', href: '#eater-map' },
      { name: 'Record Engine' },
    ],
  },
  stage: {
    slabAlt:
      'The Eater map over Soho and Covent Garden, restaurants marked across it and the ' +
      'rail network drawn over the streets in the lines’ own colours.',
  },
  copy: [
    "Eater's London guides are superb and scattered across hundreds of articles, " +
      'each with its own small map. This scrapes all of them, merges duplicates into ' +
      "one record per restaurant with a threshold read off the data's own error modes, " +
      'and serves the result as an offline-first PWA. Put your phone in airplane mode ' +
      'on the Underground and it all still works.',
  ],
  points: [
    {
      title: 'Search',
      part: 'search',
      figure:
        'Full-text across 2,336 restaurants, 296 guide titles, addresses and ' +
        'descriptions, plus place geocoding.',
    },
    {
      title: 'The rail overlay',
      part: 'lines',
      figure:
        'The whole network in official line colours; where lines share track the ' +
        'geometry splits into side-by-side bands rather than one hiding another.',
    },
    {
      title: 'One record per restaurant',
      part: 'details',
      figure:
        '4,043 guide entries merged into 2,336; 665 carry write-ups from more than ' +
        'one guide.',
    },
    {
      title: 'It works on the Tube',
      part: 'slab',
      figure:
        'Around 76 MB of vector tiles precached; the service worker slices HTTP Range ' +
        'out of the Cache API itself, because the Cache API cannot serve ranges.',
    },
  ],
});
