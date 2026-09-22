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
  standfirst:
    'Tools for the home server, tools for the way I work, and two pieces of coursework.',
  placeholder: 'Screenshot to follow',
  entries: [
    {
      title: 'Record Engine',
      year: '2026',
      made: 'TypeScript · Chrome DevTools Protocol · ffmpeg',
      note:
        'A screen recording of a website cannot be taken twice: the next time the page ' +
        'changes, so do the scroll, the timing and the take. Here the motion is committed ' +
        'as TypeScript and the capture is deterministic. Chromium is stepped one ' +
        'compositor frame at a time over the raw DevTools socket, since Playwright cannot ' +
        'pass the flag that needs, and ffmpeg encodes the frames. 23,600 lines, one ' +
        'dependency.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh/record' },
      still: {
        file: 'record-engine.webp',
        alt:
          'The Record Engine’s dark interface previewing a scroll of an example page, with a ' +
          'frame scrubber underneath and sliders for the motion’s timings on the right.',
      },
    },
    {
      title: 'Film Index',
      year: '2026',
      made: 'SvelteKit · SQLite · Rust · Tauri',
      note:
        'They Shoot Pictures, Don’t They? ranks 26,552 films, and no streaming service ' +
        'carries more than a fraction of them. Film Index turns the list into a private ' +
        'cinema: browse and filter the ranking, track what each of us has watched, send a ' +
        'film to the home library in one click, and play it in the browser through the ' +
        'server’s GPU or natively in mpv. The public demo is the catalogue half, with the ' +
        'home server switched off.',
      link: { text: 'Live demo', href: 'https://demo.films.chrisj.uk' },
      still: {
        file: 'film-index.webp',
        alt:
          'Film Index in dark mode: a filter sidebar of decades, colour and genre beside a ' +
          'grid of posters with gold rank badges, led by Citizen Kane, Vertigo, 2001: A ' +
          'Space Odyssey and Tokyo Story.',
      },
    },
    {
      title: 'TF2 Cosmetics Catalogue',
      year: '2026',
      made: 'Next.js · Blender · Cloudflare Workers',
      note:
        'Every Team Fortress 2 cosmetic, worn on a class, with its trade price in dollars ' +
        'and in keys. The wiki’s pictures stay on the wiki, so it renders its own in ' +
        'Blender, from the game’s own models. Paste a Steam profile and it shows only what ' +
        'you own, through a Worker that holds no API key. A non-commercial fan project, ' +
        'built in two days by agents working its own issue board.',
      link: { text: 'Live site', href: 'https://tf2-cosm.vercel.app' },
      still: {
        file: 'tf2-cosmetics.webp',
        alt:
          'The TF2 Cosmetics Catalogue: a grid of Team Fortress 2 characters rendered wearing ' +
          'hats and cosmetics, each priced in keys, refined metal and dollars, beside filters ' +
          'for class, slot, price and sort order.',
      },
    },
    {
      title: 'RCR Job-Plan Automation',
      year: '2024',
      made: 'Django · SvelteKit · TypeScript',
      note:
        'Before an NHS Trust can advertise a consultant radiologist’s post, the Royal ' +
        'College of Radiologists reviews its job description. That ran on a 44-column ' +
        'spreadsheet, Word forms and email across more than a hundred Trusts, and I was ' +
        'the one running it while I studied. My dissertation automated the job: a portal ' +
        'for each role, a state machine that draws its own diagram so everyone can see ' +
        'where a post stands, and checklists edited without code. 92.7%, and the EECS ' +
        'Final Year Project Prize.',
      link: {
        text: 'Source',
        href: 'https://github.com/chrisJuresh/qmul-coursework/tree/main/final-year-project',
      },
      still: {
        file: 'rcr-job-plan.webp',
        alt:
          'The JD Review Form: a checklist of a job description’s requirements, each with a ' +
          'tick for present, a page reference, the Trust’s evidence note and a box for the ' +
          'College’s comments.',
      },
    },
    {
      title: 'a3watch',
      year: '2026',
      made: 'Python · SvelteKit',
      note:
        'Home-server monitoring that never wakes a sleeping disk. SMART pollers spin ' +
        'drives up and resident agents burn watts, so this is a standard-library sampler ' +
        'with a command allowlist that makes waking a disk impossible by construction. ' +
        'Every spin-up and every rise in power is traced to the process behind it, with a ' +
        'confidence and the evidence, and the dashboard prices its own electricity.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh/dashboard' },
      still: { alt: 'A placeholder where a screenshot of a3watch will go.' },
    },
    {
      title: 'One change, one worktree',
      year: '2026',
      made: 'Python · Node · Claude Code',
      note:
        'A rule that asks an agent whether a change is small enough to make in place ' +
        'fails at once, because every change is small while it is being made. So this ' +
        'one does not ask. A hook checks a single fact — .git is a file in a worktree and ' +
        'a directory in the main checkout — and refuses every write and every ' +
        'history-changing git command on the wrong side of it. This site is built under ' +
        'it.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh/skills' },
      still: { alt: 'A placeholder where a screenshot of the worktree guard will go.' },
    },
    {
      title: 'A gated CNN on CIFAR-10',
      year: '2024',
      made: 'Python · PyTorch',
      note:
        'The brief set an unusual block, in which every convolution is several parallel ' +
        'ones blended by a small learned gate, and a bar of 94% on CIFAR-10. I implemented ' +
        'it from scratch and then worked on the training: a fourth stage, SGD with ' +
        'momentum and cosine annealing in place of Adam, and Cutout. That took a 91.07% ' +
        'baseline to 95.03% test accuracy. Graded 100%.',
      link: {
        text: 'Source',
        href: 'https://github.com/chrisJuresh/qmul-coursework/tree/main/neural-networks',
      },
      still: {
        file: 'cifar-cnn.webp',
        alt:
          'Training curves over 150 epochs: test accuracy rises unevenly from about 21% to ' +
          '95.03%, past the brief’s 94% target, while train accuracy reaches 97.63% and ' +
          'both losses fall towards zero.',
      },
    },
    {
      title: 'paperWiz',
      year: '2021–2026',
      made: 'C# · WPF · Bash',
      note:
        'One wallpaper never fits every screen. paperWiz takes the dominant colour of the ' +
        'picture you choose, paints your other monitors with it, and frames small or ' +
        'portrait pictures so they look intended on a wide display. It began as a Bash ' +
        'script over feh and pywal and is now a native Windows app that talks straight to ' +
        'the wallpaper COM API, puts your setup back after you sign in, and installs ' +
        'without admin rights.',
      link: { text: 'Source', href: 'https://github.com/chrisJuresh/paperWiz' },
      still: { alt: 'A placeholder where a screenshot of paperWiz will go.' },
    },
  ],
  colophon: { text: 'The rest is on GitHub', href: 'https://github.com/chrisJuresh' },
});
