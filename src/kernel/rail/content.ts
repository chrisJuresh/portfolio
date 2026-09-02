import { defineContent, z } from '../content';

/**
 * The Rail's Content, and its schema.
 *
 * THE ONE CONTENT FILE THAT IS NOT A SECTION'S, because the Rail is not a
 * Section's either (#192): it is one piece of furniture standing on the page,
 * naming every project the Portfolio can show, and both Sections used to hold a
 * copy of these words. Two copies of a list is two lists, and the one that was
 * out of date was whichever had not been edited last.
 *
 * WHAT THAT COSTS, STATED RATHER THAN DISCOVERED: the Editor writes Content for
 * a SECTION — `scripts/editor/lib/sections.mjs` discovers `src/sections/*` and
 * nothing else — so these five words are the only ones on the page an agent has
 * to change by hand. Kernel Content reaching that surface is a ticket of its
 * own, and a small one: the Kernel's Tokens already answer to `kernel-<stem>`
 * there, and this would be the same move for the other boundary.
 */
const schema = z.object({
  /** The landmark's name. Spoken, never drawn. */
  label: z.string().min(1),
  /**
   * Said after a project with no Section of its own. Grey says it to anything
   * looking; this says it to anything listening.
   */
  unbuilt: z.string().min(1),
  /**
   * An entry is a route if it holds a link, and that is the whole of the
   * machinery — the fragment already names the Section, so no attribute has to.
   * An entry with no `href` is one of the ones that are not built yet.
   */
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        href: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

export type RailContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  label: 'Projects',
  unbuilt: ' — no page yet',
  projects: [
    { name: 'Photo Vault', href: '#projects' },
    { name: 'Eater Map', href: '#eater-map' },
    { name: 'Record Engine' },
  ],
});
