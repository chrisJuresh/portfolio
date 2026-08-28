# design/reference/

Design renders and reference photographs a composition was **measured off**,
rather than baked from. Nothing in the build reads this directory; it exists so
that a magic number in a stylesheet can cite the picture it came from.

**Ignored, and the reason is not size.** These are screenshots of the real photo
grid: they show uncensored photographs of real people. `photos/` is ignored under
the same rule, and `design/censor/` exists precisely so that what gets published
is the mosaicked clip in `portfolio/video/` instead. **Do not commit anything in
here, and do not make an exception to check one arithmetic step** — a reviewer who
flags a "magic number citing a file not in the repo" is right to, and the answer
is that the numbers below are constants of the composition, not that the render
should be added.

This README is the only committed file in the directory.

## `IMG_20260815_153956.jpg` — the Projects Panel render

2568×1632. Every proportion in the `.panel` block of `portfolio/styles.css` was
measured off it, and `design/plinth/build-slab.py` solves its camera from it:

| measurement | value |
| --- | --- |
| masthead cap | 5.1% of the render's width |
| subheading cap | 3.2% (ratio 1.59) |
| Frame | 1430×735 (ratio 1.945) |
| front arris | y 1549, flat across x 420..2370 |
| back edge | y 1482, visible only left of the Frame |
| contact line | y 1518, where the Frame's foot stands |

`build-slab.py`'s own docstring carries the camera solution in full. It is the
issue #57 render, and #63–#74 are its children.

**A worktree does not have it.** Git only puts tracked files in one, so an
ignored file sitting in the main checkout is simply absent — copy it across if a
detail needs re-measuring. Crop with Pillow into a scratch directory when it does;
the Frame/subheading overlap is only legible zoomed.
