import { defineContent, z } from '../../kernel/content';

/**
 * The Front Screen's Content, and its schema. NOTES.md is why the headings and
 * the toggle's two words are in here rather than in the markup.
 */
const entry = z.object({
  org: z.string().min(1),
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
  /** Where the Cut Title points. The masthead said the same word in small type
      above a word cut off the page's own bottom edge, so it no longer says it. */
  projects: z.object({
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
  /**
   * The photographs, in display order, left to right.
   *
   * `file` names a photograph in the old tree — see PHOTO_BASE in
   * FrontScreen.astro, which is the one line that says where the bytes are. `alt`
   * is what a reader who cannot see it is told, and it is the only description of
   * the picture anywhere: nothing on the page captions a photograph.
   *
   * The order is the author's and is arranged by hand. Nothing derives it and
   * nothing checks it: #137 puts reordering out of scope deliberately, so this
   * list is the same sequence `portfolio/content.js` carries, in the same order.
   */
  photos: z.object({
    /** What a screen reader calls the strip. */
    label: z.string().min(1),
    items: z
      .array(
        z.object({
          file: z.string().min(1),
          alt: z.string().min(1),
        }),
      )
      .min(1),
  }),
});

export type FrontScreenContent = z.output<typeof schema>;

export const content = defineContent(schema, {
  name: 'Christian Juresh',
  location: 'London, UK',
  bio: [
    'I’m a software engineer on an integration team, shipping work end to end — backend, platform and frontend.',
  ],
  projects: { href: '#projects' },
  work: {
    heading: 'Work Experience',
    entries: [
      {
        org: 'Third Bridge Group Limited',
        years: '2024–Present',
      },
      {
        org: 'Royal College of Radiologists',
        years: '2022–2024',
      },
    ],
  },
  education: {
    heading: 'Education',
    entries: [
      {
        org: 'Queen Mary University of London',
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
  photos: {
    label: 'Photographs',
    items: [
      { file: '1100328.jpg', alt: 'Clivia in bloom' },
      { file: '1110667.jpg', alt: '30 St Mary Axe, London' },
      { file: '1090712.jpg', alt: 'Kew Palm House glasshouse' },
      { file: '1100324.jpg', alt: 'Red pomegranate blossom' },
      { file: '1110312.jpg', alt: 'Dome of St Paul’s Cathedral' },
      { file: '1090948.jpg', alt: 'Hanging catkins, Kew Gardens' },
      { file: '1110841.jpg', alt: 'Riverside towers through a telescope' },
      { file: '1100025.jpg', alt: 'White blossom' },
      { file: '1110462.jpg', alt: 'Red Thames Clipper on the river' },
      { file: '1100149.jpg', alt: 'Spiral aloe succulent' },
      { file: '1110613.jpg', alt: 'Tower of London turret with a Union flag' },
      { file: '1090923.jpg', alt: 'White umbel flowers' },
      { file: '1110559.jpg', alt: 'Domed building framed through a window' },
      { file: '1100015.jpg', alt: 'Pink anthurium flower' },
      { file: '1110727.jpg', alt: 'Curving railway tracks' },
      { file: '1100246.jpg', alt: 'Cherry blossom branch' },
      { file: '1110020.jpg', alt: 'White observation tower against the sky' },
      { file: '1130972.jpg', alt: 'Sunset over the rooftops' },
      { file: '1110604.jpg', alt: 'Cross-shaped arrow slit in a stone wall' },
      { file: '1110625.jpg', alt: 'Ornate turret with flowers' },
      { file: '1100411.jpg', alt: 'Treetop walkway, Kew Gardens' },
      { file: '1110587.jpg', alt: 'Port of London Authority building beside a crane' },
      { file: '1120058.jpg', alt: 'Shipping cranes at the docks' },
      { file: '1100182.jpg', alt: 'Bare tree against a blue sky' },
      { file: '1110530.jpg', alt: 'The Shard with a passing plane' },
      { file: '1130892.jpg', alt: 'The moon in a dark sky' },
      { file: '1110662.jpg', alt: 'Statue of an archer atop a tower' },
      { file: '1140153.jpg', alt: 'Contrails over rooftops at dusk' },
      { file: '1110676.jpg', alt: 'Glass towers of the City of London' },
      { file: '1120124.jpg', alt: 'Hazy countryside view' },
      { file: '1110739.jpg', alt: 'The Shard beyond rooftops, with a train' },
      { file: '1140126.jpg', alt: 'The moon above a tree at dusk' },
      { file: '1140227.jpg', alt: 'Canal and skyline' },
      { file: '20250630_212113.jpg', alt: 'St George Wharf towers, Vauxhall' },
      { file: '1130495.jpg', alt: 'The London Eye across the Thames' },
      { file: '1130678.jpg', alt: 'Riverside skyline from the water' },
      { file: '1110063.jpg', alt: 'A single rose in low light' },
      { file: '1100214.jpg', alt: 'Kew Palace and lawn' },
      { file: '1110644.jpg', alt: 'citizenM hotel facade' },
      { file: '1090882.jpg', alt: 'Red flower in shade' },
      { file: '1090912.jpg', alt: 'White umbel flowers' },
      { file: '1100129.jpg', alt: 'White blossom' },
      { file: '1100223.jpg', alt: 'Red-brick lodge, Kew Gardens' },
      { file: '1100346.jpg', alt: 'Glasshouse across the gardens' },
      { file: '1110154.jpg', alt: 'Deckchair in the park' },
      { file: '1110168.jpg', alt: 'Kayakers on the river' },
      { file: '1110581.jpg', alt: 'Modern glass building' },
      { file: '1110650.jpg', alt: 'White office building' },
      { file: '1110664.jpg', alt: 'City office buildings' },
      { file: '1120145.jpg', alt: 'Countryside view' },
      { file: '1120179.jpg', alt: 'Countryside view' },
      { file: '1130576.jpg', alt: 'The London Eye from the water' },
      { file: '1110986.jpg', alt: 'Glass roof, London' },
    ],
  },
});
