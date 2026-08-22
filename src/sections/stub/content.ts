import { defineContent, z } from '../../kernel/content';

/**
 * The stub Section's Content, and its schema.
 *
 * Rename a field in either half and the build stops: TypeScript on the pair,
 * because `data` below is typed as this schema's own input, and the parse on
 * anything a type cannot see. Rename it in the component instead and TypeScript
 * stops there. There is no third way for a field to go missing quietly.
 */
const schema = z.object({
  heading: z.string().min(1),
  lead: z.string().min(1),
  points: z.array(z.string().min(1)).min(1),
});

export type StubContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  heading: 'Stub',
  lead:
    'A Section that exists to make the convention real rather than described. ' +
    'It owns this markup, these styles, these Tokens, this Content, its Timeline ' +
    'and its assets, and it reads nothing but the Kernel.',
  points: [
    'Its styles are scoped by the build, so no selector here can reach another Section.',
    'Its Content is typed, so renaming a field is a build error and not a blank space.',
    'Its Timeline is one named seekable object, so a Check can ask it for a moment.',
    'It mounts as it approaches the viewport, not at load.',
  ],
});
