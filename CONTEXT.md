# Portfolio

`chrisj.uk` — a personal site. This context is `/portfolio`: one document,
navigated by scrolling, made of Sections. Nothing else on the site shares its
composition or its vocabulary.

## The page

**Portfolio**:
The single document at `/portfolio`, and everything in it. Its Sections are
reached by scrolling, never by clicking.
_Avoid_: the portfolio page, the CV page, the site

**Section**:
One self-contained part of the Portfolio's scroll, owning its own markup,
styles, Tokens, Content, Timeline and assets. A Section may read the Kernel and
nothing else.
_Avoid_: page, slice, module, component

**Shell**:
The thin document carrying the head, the Kernel, and the Sections' mount points.
It holds no composition of its own.
_Avoid_: layout, template, index

**Kernel**:
The small set of things every Section may rely on — faces, theme, the Turn, the
Effect Stack, the loader. The only thing permitted to cross a Section boundary.
_Avoid_: globals, shared, common, base

**Showcase**:
A Section presenting one project in depth, with a composition built for that
project alone.
_Avoid_: case study, project page, feature

## The two Sections that exist

**Front Screen**:
The Section at the top of the Portfolio — masthead, bio, photo carousel, work,
education, contact, theme toggle — fitted to exactly one screen.
_Avoid_: front page, home, hero, above the fold

**Projects Panel**:
The dark Section presenting one project at a time: a Rail, a masthead, copy, and
the Frame on its Plinth.
_Avoid_: projects page, photo gallery page, gallery

## What the composition is made of

**Turn**:
The Portfolio crossing from paper into dark as the reader scrolls. A property of
the page's ground, belonging to the Kernel, not to any Section.
_Avoid_: dark mode, the transition, scroll effect

**Cut Title**:
A word drawn as a picture rather than set as type, standing at a Section's foot.
_Avoid_: heading, wordmark, the big word

**Frame**:
The browser window a Showcase's recording is shown inside — chrome, titlebar,
controls — drawn by the page rather than captured.
_Avoid_: window, mockup, browser chrome

**Lens**:
The material a Frame's titlebar is made of: refraction, dispersion, Fresnel,
glare and tint, with a named fallback for an engine that cannot refract. It is a
lens rather than a pane because it is in front of something and bends it — a
Frame whose recording stops at the titlebar has nothing for its Lens to do.
_Avoid_: glass, blur, frosted, the shader, liquid glass

**Plinth**:
The rendered marble slab a Frame stands on, with the Frame's live reflection
lying in it.
_Avoid_: pedestal, base, stand

**Rail**:
The list down a Section's edge naming what can be shown there, marking which is
selected and which is not yet built.
_Avoid_: nav, sidebar, menu, tabs

**Effect Stack**:
The Kernel's layers over the finished page — paper tooth, halftone, film, grain,
grille, scan, roll, tube, vignette — each inert until named.
_Avoid_: filters, overlays, post-processing

**Timeline**:
A Section's motion as one named, seekable object. Asking a Timeline for a given
moment is how both the Editor and a Check see motion.
_Avoid_: animation, transition, sequence

## What is edited, and how

**Token**:
One of a Section's named numbers or colours, held as a plain CSS custom
property. Tokens are the only values the Editor may change directly.
_Avoid_: variable, setting, config, knob

**Content**:
A Section's words and its list of assets, held as data, apart from the markup
that presents them.
_Avoid_: copy, strings, CMS

**Editor**:
The local surface that opens the real Portfolio and changes its Content and
Tokens in place, and re-bakes generated assets. It writes a Section's Content, a
Section's Tokens, and an Override outside every Section — and nothing else.
_Avoid_: dashboard, CMS, tuner, admin, studio

**Bake**:
A generator and the numbers it is run with, declared in one folder the Editor
reads and the generator reads too. A Token moves the page in the frame it is
dragged in; a baked parameter moves nothing until the generator has run, which is
what makes it a second kind of thing rather than another Token.
_Avoid_: preset, pipeline, job, recipe on its own, build

**Annotation**:
The Editor's output when a wanted change is not expressible as a Token: a
measured instruction, in words and numbers, for an agent to apply.
_Avoid_: comment, note, feedback, request

**Override**:
A value the Editor wrote outside a Section's composition so the page looks right
now, pending an agent folding it in properly.
_Avoid_: patch, hack, hotfix

**Variant**:
One of several complete alternative directions for a Section, all present in the
source at once, selected by attribute so they can be rendered side by side and
chosen by eye. The losers stay as the record of what was judged.
_Avoid_: version, option, theme, experiment

**Check**:
A headless, blocking assertion about the served Portfolio, or about a tool that
writes it. Most guard something a person would not notice failing — a face
falling back, a 404 on a rung nothing draws, dark theme drifting light — and that
is what keeps the suite small. Checks never assert whether something looks good.
_Avoid_: test, spec, lint, validation

**Agent Contract**:
The document telling an agent what a seam and a test mean in this repository,
read before any spec or implementation.
_Avoid_: guidelines, conventions, readme

## Beyond this repository

**Career Record**:
The private, authoritative source for every word about the author's work and
study. Only its rendered, publishable fields ever reach the Portfolio.
_Avoid_: the CV repo, the source of truth

**Record Engine**:
The author's separate tool that drives a page through a timeline — plain data:
framerate, a starting state, and segments — and encodes the result as a clip.
_Avoid_: the recorder, the video tool

**Roll**:
Every photograph a recording's camera passes over, collected mechanically. Its
companion is the signed list of which are obscured before capture.
_Avoid_: the photo list, the manifest
