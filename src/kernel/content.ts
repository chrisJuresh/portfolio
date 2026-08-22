import { z } from 'astro/zod';

export { z };

/**
 * A Section's Content, typed by its own schema.
 *
 * ADR 0002 buys a build step for two mechanisms, and this is the second of them:
 * renaming a field has to be an error before the page is served rather than a
 * blank space discovered later. That needs both halves.
 *
 * TypeScript catches the rename at three seams — schema against data, data
 * against schema, and component against either — because `data` is typed as the
 * schema's own input. The parse catches what a type cannot: a value that is the
 * right shape and the wrong thing, and any drift in a file TypeScript was not
 * asked about. `/next` is prerendered, so the parse runs at BUILD time; a Section
 * whose Content does not satisfy its schema fails `pnpm build` rather than
 * shipping.
 *
 * zod comes from `astro/zod`, which Astro already ships for content collections,
 * so this costs no dependency of its own.
 */
export function defineContent<Schema extends z.ZodTypeAny>(
  schema: Schema,
  data: z.input<Schema>,
): z.output<Schema> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const where = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Content does not satisfy its schema:\n${where}`);
  }
  return parsed.data;
}
