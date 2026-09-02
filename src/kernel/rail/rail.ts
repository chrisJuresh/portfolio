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
 * WHERE A SECTION'S PORT IS, ASKED THE WAY page-turn.ts ASKS IT: the box's top
 * edge less its own `scroll-margin-top`, which is what puts the Panel's landing
 * on the word rather than on the Section's edge. Measured per call rather than
 * cached, for the reason `ports()` does the same on every wheel notch — a
 * Section mounts on approach and changes height when it does, and its pictures
 * change it again.
 *
 * The markup already names one entry (Rail.astro), so this agrees with the
 * server at the top of the document and writes nothing until the reader moves.
 */

/** A pixel of travel is "already there" — the same slack page-turn.ts uses. */
const SLACK = 1;

export function mountRail(): void {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  if (!rail) return;
  const entries = [...rail.querySelectorAll<HTMLElement>('[data-rail-item]')];
  const named = entries.filter((entry) => entry.dataset.railFor);
  const first = named[0];
  if (!first) return;

  const at = (): HTMLElement => {
    let found = first;
    for (const section of document.querySelectorAll<HTMLElement>('[data-section]')) {
      const style = getComputedStyle(section);
      const margin = Number.parseFloat(style.scrollMarginTop) || 0;
      const port = section.getBoundingClientRect().top + window.scrollY - margin;
      if (port > window.scrollY + SLACK) break;
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
