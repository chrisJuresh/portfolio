/**
 * Which entry of the Rail is the current one.
 *
 * THE RAIL DOES NOT MOVE AND THIS IS THE ONLY THING THAT DOES (#192). There is
 * one Rail on the page, standing still in the page's own margin, so a page turn
 * is this function running and nothing else — which is what makes the Section
 * boundary invisible to the reader rather than a list being rebuilt.
 *
 * DERIVED FROM THE PAGE, NOT DECLARED BY A SECTION. The current entry is the
 * last Section at or above the reader that the Rail actually names: the Front
 * Screen names none, so the Gallery's entry stands from the top of the document
 * until the Eater Map's own port goes past. That is the same answer in both
 * regimes without either being written down — in the band the reader can only
 * rest on a port, and outside it the top edge is where a Section starts owning
 * the screen.
 *
 * WHERE A SECTION'S PORT IS, ASKED THE WAY page-turn.ts ASKS IT — and now asked
 * BY page-turn.ts, which is where `portOf()` lives. This file used to carry its
 * own copy of that arithmetic and the copy was subtly different: it did not
 * clamp, which is correct here and wrong in `ports()`. The clamping stayed with
 * the caller when the four copies became one.
 *
 * The markup already names one entry (Rail.astro), so this agrees with the
 * server at the top of the document and writes nothing until the reader moves.
 */

import { portOf } from '../page-turn';
import { onTurn } from '../turn';

/** A pixel of travel is "already there" — the same slack page-turn.ts uses. */
const SLACK = 1;

export function mountRail(): void {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  if (!rail) return;

  /**
   * WHILE THE RAIL IS INVISIBLE IT IS ALSO UNREACHABLE.
   *
   * In the band the Rail is pinned to the window and revealed on `--turn`, so at
   * the top of the document it is a transparent box lying over the Front
   * Screen's own left margin — and `opacity: 0` hides a box while leaving it
   * hit-testable AND focusable. Three invisible links and three invisible tab
   * stops, one of them over the photograph strip. The Rail used to be a
   * descendant of the Projects Panel and simply was not up there.
   *
   * `--turn` is a number and a stylesheet cannot branch on one, which is what
   * `onTurn()` is for (src/kernel/turn.ts). The attribute is the state; the rule
   * that spends it is in Rail.astro, and it is `visibility: hidden` rather than
   * `pointer-events: none` because only the first of those two takes the tab
   * stops with it.
   *
   * OUTSIDE THE BAND THIS IS INERT, and correctly so: out there the Rail is in
   * flow at the head of the index with no reveal on it, and the rule that reads
   * the attribute is inside the band's own query. The attribute is still written,
   * because what it states is a fact about the Turn rather than about a regime.
   *
   * `onTurn` calls back at once with where the Turn already is, so this is right
   * before the reader's first scroll and needs no second call here.
   */
  onTurn((turn) => {
    rail.toggleAttribute('data-rail-away', turn <= 0);
  });
  const entries = [...rail.querySelectorAll<HTMLElement>('[data-rail-item]')];
  const named = entries.filter((entry) => entry.dataset.railFor);
  const first = named[0];
  if (!first) return;

  const at = (): HTMLElement => {
    let found = first;
    for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
      if (portOf(section) > window.scrollY + SLACK) break;
      const entry = named.find((one) => one.dataset.railFor === section.id);
      if (entry) found = entry;
    }
    return found;
  };

  let showing: HTMLElement | null = null;
  const draw = (): void => {
    const now = at();
    if (now === showing) return;
    showing = now;
    for (const entry of entries) {
      const current = entry === now;
      entry.classList.toggle('is-selected', current);
      const link = entry.querySelector('a');
      if (!link) continue;
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  draw();
  window.addEventListener('scroll', draw, { passive: true });
  window.addEventListener('resize', draw);
}
