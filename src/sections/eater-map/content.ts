import { defineContent, z } from '../../kernel/content';

/**
 * The Eater Map Section's Content, and its schema.
 *
 * One field, because one field is all this Section renders yet. The masthead,
 * the two subheading lines, the copy and the four numbered points arrive with
 * the Section itself (#175); the Cards beside them carry the app's own words and
 * are not Content — they are vendored bytes, and the Editor must not offer to
 * rewrite somebody else's interface. NOTES.md says why that line is where it is.
 */
const schema = z.object({
  heading: z.string().min(1),
});

export type EaterMapContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  heading: 'Eater Map',
});
