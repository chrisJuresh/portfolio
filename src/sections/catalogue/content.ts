import { defineContent, z } from '../../kernel/content';

/**
 * The Catalogue's Content, and its schema.
 *
 * Every word the Section draws is here: the head, the Entries, the placeholder's
 * own label, and the colophon. The Rail's name for the Section is not — the Rail
 * is the Kernel's (src/kernel/rail/content.ts). NOTES.md says which of these words
 * are placeholders and what a real Entry replaces.
 */
const link = z.object({
  text: z.string().min(1),
  href: z.string().min(1),
});

const entry = z.object({
  /** The project's name, set in the serif. The column may break it. */
  title: z.string().min(1),
  /**
   * When, and what it was made with: the small tracked line under the title.
   * Two strings rather than one, so the Editor offers each on its own and the
   * separator between them stays the composition's.
   */
  year: z.string().min(1),
  made: z.string().min(1),
  /** One paragraph, and one only. The Catalogue says a little about many things. */
  note: z.string().min(1),
  /**
   * Where the project lives. Optional, because not every project has a public
   * home, and an absent link is what says so — the layout leaves the slot empty.
   */
  link: link.optional(),
  /**
   * The Still. `file` names a picture under assets/stills/ and is resolved at
   * BUILD, so an Entry naming a picture that is not there fails `pnpm build`
   * rather than shipping a 404; an Entry naming none is drawn as the placeholder.
   * `alt` is the only description of the picture a reader who cannot see it is
   * given, so it is required even while the picture is a placeholder.
   */
  still: z.object({
    file: z.string().min(1).optional(),
    alt: z.string().min(1),
  }),
});

const schema = z.object({
  /** The Section's accessible name, and the word at the head of the column. */
  masthead: z.string().min(1),
  standfirst: z.string().min(1),
  /** What a placeholder Still says in its corner, in words. */
  placeholder: z.string().min(1),
  /** In the order they are read down the page. An <ol>, so the numbers are the
   *  list's own and never typed. */
  entries: z.array(entry).min(1),
  /** The last line of the Section, and the only link in it that is not an Entry's. */
  colophon: link,
});

export type CatalogueContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  masthead: 'Other work',
  standfirst: 'Smaller projects, one still and a few words each.',
  placeholder: 'Still to follow',
  entries: [
    {
      title: 'Record Engine',
      year: 'Year',
      made: 'Language · Framework · Tool',
      note:
        'Drives a page through a timeline — plain data: a framerate, a starting state ' +
        'and segments — and encodes the result as a clip. The recording the Projects ' +
        'Panel plays was made with it.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the still of the Record Engine will go.' },
    },
    {
      title: 'Placeholder with a title long enough to wrap onto a second line',
      year: 'Year',
      made: 'Language · Framework',
      note:
        'Two or three sentences on what the project is, what it does and what was hard ' +
        'about it. This is the length most Entries will have. Pick it in the Editor and ' +
        'type over it.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the second still will go.' },
    },
    {
      title: 'Short one',
      year: 'Year',
      made: 'Language',
      note: 'One sentence, for the shortest note the layout has to carry.',
      link: { text: 'Live site', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the third still will go.' },
    },
    {
      title: 'Placeholder four',
      year: 'Year',
      made: 'Language · Framework · Tool · Tool',
      note:
        'Four sentences, for the longest note the layout has to carry beside a still. ' +
        'The words are set in the sans the dark half of the page is set in, and the ' +
        'title above them in the serif the paper half is set in. A note this long ' +
        'runs past the foot of its still on a short screen, and that is allowed.',
      still: { alt: 'A placeholder standing where the fourth still will go.' },
    },
    {
      title: 'Placeholder five',
      year: 'Year',
      made: 'Language · Framework',
      note:
        'An Entry with no link, so the slot under the note is simply empty rather ' +
        'than pointing nowhere.',
      still: { alt: 'A placeholder standing where the fifth still will go.' },
    },
    {
      title: 'Placeholder six',
      year: 'Year',
      made: 'Language · Tool',
      note:
        'Two sentences here. The second one is only here so the note is two lines ' +
        'deep rather than one.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the sixth still will go.' },
    },
    {
      title: 'Placeholder seven',
      year: 'Year',
      made: 'Language · Framework · Tool',
      note:
        'Three sentences describing a project. What it is for, who it was for, and ' +
        'the one thing about it worth a paragraph. Replace all three.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the seventh still will go.' },
    },
    {
      title: 'Placeholder eight',
      year: 'Year',
      made: 'Language',
      note:
        'The last Entry, so the spine ends under it. Two sentences, like most of ' +
        'the others.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh' },
      still: { alt: 'A placeholder standing where the eighth still will go.' },
    },
  ],
  colophon: { text: 'Everything else is on GitHub', href: 'https://github.com/chrisJuresh' },
});
