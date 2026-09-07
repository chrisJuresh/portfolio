# The Catalogue's assets

`stills/` holds the Stills: one picture per Entry, named in that Entry's
`still.file` in `../content.ts`. `Catalogue.astro` resolves the name at build
through `import.meta.glob`, so a name that matches nothing here fails
`pnpm build` rather than shipping a 404, and an Entry naming no file is drawn as
the placeholder. Any of `avif`, `webp`, `png`, `jpg` or `jpeg`; a Still is
cropped to the Section's `--catalogue-still-ratio`, so cut it to that shape
before it goes in. `NOTES.md` beside this folder says how one arrives.
