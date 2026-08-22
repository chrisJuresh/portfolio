# The Editor

The tool that takes text changes out of the token budget. Opened locally, it shows
the real Portfolio; clicking a piece of text changes it; Publish commits and
pushes.

```bash
pnpm editor
```

```bash
pnpm editor -- --no-build --port 8790
```

It builds this tree, serves that `dist/`, and prints a URL. Click any text, type,
Enter. Escape puts it back. The panel at the bottom right lists every Content
field of every Section, which is how anything the page speaks without drawing is
reached.

**This ticket delivers Content. Tokens are #144.** ADR 0004 gives the Editor both;
nothing here writes a `tokens.css`, and `lib/sections.mjs` is where that grows.

## The shape, and why it is this shape

**A write boundary, with a browser on top** (ADR 0004). `lib/content.mjs` is the
whole of the Editor's authority over the repository: given a Section's
`content.ts`, a key and a value, produce the file's bytes. Everything above it —
the server, the surface, the panel — is a way of calling that function. The tests
are on the function, at the bytes, because this is the one component in the
repository whose bugs corrupt source files instead of appearing on screen.

**It replaces a span; it does not re-serialise.** A Section's Content is
TypeScript carrying comments, a schema, authored line breaks and long strings
written as a sum of literals. Reading it into an object and writing it back would
produce a file that parses and has lost all of that. So the only edit made is:
find the bytes of one string literal, put different bytes there. `write` proves
that about its own output before returning it — it re-reads the bytes and requires
the same fields in the same order with one value changed — so a parser bug here is
a refusal rather than a damaged file.

**One value written over a sum comes back as one literal.** `'a long ' + 'string'`
becomes `'a long string'` on one line. That is the one formatting change the
boundary makes, it is why `write` returns the source untouched when the value has
not changed, and it is the reason there is no test asserting the file is
byte-identical after any write.

**Only strings.** An object or an array is a Section's structure rather than its
words, and editing one would mean re-serialising. Both are refused by name, so
"an array, not a string" is what the author reads rather than "no such key".

## What it will and will not write

`lib/sections.mjs` is the only thing in the Editor that turns anything off the
wire into a filesystem path, and **it takes a Section NAME rather than a path.**
The filename is a constant. There is no argument to any of this that could make
the Editor write a component, a stylesheet or a Token — not a traversal, not an
encoding, not a malformed name — because the name of the file is never composed
from input. A Section not on disk is refused before any path handling runs.

`sections.test.mjs` is that assertion, spelled ten ways.

## How a click finds a Content key

Nothing in a Section's markup says which Content field it draws, and nothing
should: an attribute per string would be markup written for a tool, shipped to
every reader, in the repository whose whole point is that a Section holds only
itself. So the binding is made by **matching**. The server hands over every
Content value; an element whose own text is exactly one of them is that field.
Content is the words on the page, so the words on the page are how it is found.

Three consequences, and each one has a visible answer in the panel rather than a
silent failure:

**The value matched against is the one the SERVED BUILD was made from**, not the
current one. The server captures every Content value at startup — that is the
`built` half of each field — and reads the current half off disk per request. The
surface finds an element by `built` and displays `value`. This is what makes an
edit survive a reload: the built page still says what the build put there, and the
surface puts the current value over it. A field whose `built` value is not on the
page is reported as not found, which is also how a stale `--no-build` dist
announces itself.

**Two fields holding the same string are left unbound.** `Projects` is the Front
Screen's link, its Cut Title, the Panel's masthead and the Rail's spoken name;
picking one of those for the author would edit a field they were not looking at.

**The click surface reaches text an element wholly owns.** A Rail item is
`Eater Map` followed by a `<span>` holding a different field, so its text is two
fields' worth — making it editable would let one edit rewrite both, and the safe
alternative, editing the text node under a `contenteditable` parent, cannot stop
the author deleting the sibling. Those go through the field list. As does
` — no page yet`, for a different reason worth knowing: markup adds whitespace, so
matching is done trimmed, and the click path puts the original value's leading and
trailing space back on the way out. The panel's input carries the raw value
instead, spaces included, because there the author is looking at the string
itself.

A bound element carries three attributes, and three rather than one composite is
the point: `data-editor-key` is `section.field` and reads well in devtools, while
`data-editor-section` and `data-editor-field` are what anything downstream
actually consumes. A field key holds dots of its own —
`work.entries.0.org` — so anything handed only the composite has to guess where the
Section name ends. Nothing on the page needs any of them.

## Publish

Two things about the commit are load-bearing.

**It is pathspec-limited** to the Content files git itself reports as changed.
`git commit -- <paths>` commits those and leaves the rest of the index alone, so
an agent's staged work in another window cannot ride along in a commit the author
thinks is a typo fix. The paths come from `git status` filtered to Content, never
from anything the browser said — the browser cannot name a file at all.

**It does not pass `--no-verify`.** `.githooks/pre-commit` runs the Checks on every
commit (ADR 0006), so a Publish takes about a minute and a broken tree refuses to
publish. That is the gate working, and the refusal quotes the hook rather than
reporting "git failed". The panel says so before it starts.

A push that fails is a **report and not a refusal**: the commit has landed by
then, and calling the whole thing a failure would send the author looking for work
that is already committed. Publish also reports what it left alone, so a dirty
tree is visible rather than silent.

## The handshake header, which is not decoration

This server writes source files and answers on localhost, so any page in any
browser tab can reach it. A simple `POST` is not subject to a preflight, so a
drive-by page could otherwise post to it. Every route that changes something
requires an `x-editor: 1` header, which a cross-origin request cannot set without
a preflight, and nothing here answers a preflight. The smoke Check asserts a
write with no handshake is refused, and that assertion has been shown to fail when
the requirement is removed.

## Nothing about it ships

The injection happens in the Editor's own response, on the Editor's own origin.
`dist/` is Astro's output plus the four static roots `scripts/assemble-dist.mjs`
copies in, and `scripts/` is not among them — so there is nothing to exclude and
nothing to remember. The smoke Check asserts it anyway, against the build the rest
of the suite is served from.

## It serves the tree it was invoked from

Same rule as `pnpm preview` and the Checks, and here it has teeth: the in-app
preview serves the main checkout, so in a worktree it would let the author edit one
tree's Content while looking at another's. **Never open the Editor through
`preview_start`.**

## Two traps

**The Section-name pattern lives in `sections.mjs` and is exported.** Publish has
to recognise a Content path in `git status` output, and the first version of it
hand-wrote `[a-z][a-z0-9-]*` — looser than the real pattern, so `a--b/content.ts`
and `trailing-/content.ts` would both have been committed as Sections. Two files
disagreeing about what a Section is called is the kind of thing that decides what
gets committed, so there is one pattern and `contentAmong` builds its shape from
it.

**`getSelection().selectAllChildren` and then `Control+A`.** The surface selects
the element's text when it becomes editable, but a driver still has to press
select-all before typing — Playwright's `type` appends otherwise, and the
resulting value looks like a boundary that concatenated instead of replacing.

**A refusal logs a console error.** The `400` is correct and the surface reports
it in words, but it means the Editor's own page is not console-clean after a
refusal. The `console` Check is unaffected — it runs against `dist/` without the
Editor — and the smoke Check does not assert console cleanliness for that reason.

## One object, and not four modules

`client/editor.js` is one `Editor` class doing binding, in-place editing, the
panel, publishing and listening, and its own dividers mark those seams — a fair
reading is that it wants splitting. It is not split because the seams share one
piece of state: the field index that binds an element is the same index the panel
renders and the same one a write updates, and there is exactly one instance of it.
Splitting would mean either shipping a bundler for a dev-only tool or serving
three more routes and hand-wiring the imports, both of which are more machinery
than the thing being organised. If it grows a second surface — Tokens, #144 —
that calculus changes.

## The tests

| file | asserts |
| ---- | ------- |
| `lib/content.test.mjs` | the bytes: what moved, what did not, and every refusal |
| `lib/sections.test.mjs` | that a request cannot name a file |
| `lib/publish.test.mjs` | which arguments git is handed, and what counts as a Content path |
| `scripts/checks/checks/editor.mjs` | one smoke Check: click, type, find it in the file |

`pnpm test` runs the first three; `pnpm check` runs them and then the Check.

The Check writes to a **temporary copy** of every Section's Content and compares
the real files before and after. That matters more than it sounds: it runs from
the pre-commit hook, and a Check that edited the tree it was gating would put a
file it wrote into the commit it was checking.

Four mutations have been shown to fail it: the boundary writing nothing, the
handshake requirement removed, the surface binding nothing, and empty values
allowed — the last of which is caught by `content.test.mjs` before the browser
starts, which is where it belongs.
