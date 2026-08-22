import { defineContent, z } from '../../kernel/content';

/**
 * The Front Screen's Content, and its schema. NOTES.md is why the headings and
 * the toggle's two words are in here rather than in the markup.
 */
const entry = z.object({
  org: z.string().min(1),
  /** the role or the subject — the second line under the organisation */
  detail: z.string().min(1),
  years: z.string().min(1),
});

const listing = z.object({
  heading: z.string().min(1),
  entries: z.array(entry).min(1),
});

const schema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  /** The first paragraph is the lead and is set in italics. */
  bio: z.array(z.string().min(1)).min(1),
  /** The masthead's one link, and the Cut Title's: both point at the same place. */
  projects: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
  }),
  work: listing,
  education: listing,
  contact: z.object({
    heading: z.string().min(1),
    entries: z
      .array(
        z.object({
          text: z.string().min(1),
          href: z.string().min(1),
        }),
      )
      .min(1),
  }),
  /** The switch's one name, and the word it shows on each paper. */
  toggle: z.object({
    name: z.string().min(1),
    onPaper: z.string().min(1),
    onDark: z.string().min(1),
  }),
  /** The Cut Title is a picture of a word; this is the word itself. */
  cut: z.string().min(1),
});

export type FrontScreenContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  name: 'Christian Juresh',
  location: 'London, UK',
  bio: [
    'I’m a software engineer on an integration team, shipping work end to end — backend, platform and frontend.',
  ],
  projects: { label: 'Projects', href: '#projects' },
  work: {
    heading: 'Work Experience',
    entries: [
      {
        org: 'Third Bridge Group Limited',
        detail: 'Associate Software Engineer',
        years: '2024–Present',
      },
      {
        org: 'Royal College of Radiologists',
        detail: 'Professional Services Administrator',
        years: '2022–2024',
      },
    ],
  },
  education: {
    heading: 'Education',
    entries: [
      {
        org: 'Queen Mary University of London',
        detail: 'BSc Computer Science',
        years: '2021–2024',
      },
    ],
  },
  contact: {
    heading: 'Contact',
    entries: [
      { text: 'christianjuresh@gmail.com', href: 'mailto:christianjuresh@gmail.com' },
      { text: 'github.com/chrisJuresh', href: 'https://github.com/chrisJuresh' },
      { text: 'linkedin.com/in/chrisjuresh', href: 'https://linkedin.com/in/chrisjuresh' },
    ],
  },
  toggle: { name: 'Dark mode', onPaper: 'dark', onDark: 'light' },
  cut: 'Projects',
});
