import { PARTS, type Part } from './leaders';

/**
 * One mark per part of the Exploded View, so each numbered point reads as an
 * annotation on a drawing rather than as an entry in a table of contents (#191).
 *
 * KEYED BY THE PART AND NOT BY THE POINT, which is the whole reason this is a
 * module rather than a field of the Content. A point already names its part —
 * that correspondence is the design's best idea and the Content's schema holds it
 * to exactly one point per part — so the icon follows from the part for nothing,
 * and an icon chosen per point would be a second place for the same decision to
 * be made differently.
 *
 * AND IT IS NOT CONTENT (ADR 0004). Content is the words the Section draws and
 * the Editor rewrites; a drawing of a magnifying glass is neither. The words that
 * say what each point is ARE Content, and a reader listening is given those: the
 * icons are `aria-hidden`, because a mark that repeats the title next to it is
 * read out twice.
 *
 * THE PATHS ARE BODIES AND NOT WHOLE DOCUMENTS. Each is what goes inside one
 * `<svg viewBox="0 0 24 24">` that the composition writes once, so the size, the
 * stroke and the joins are the stylesheet's and no icon carries a size of its own
 * — which is what lets the accent and the weight move together with the numbers
 * beside them.
 */
const MARKS: Record<Part, string> = {
  /** A magnifying glass: the search bar, and the results that hang off it. */
  search: '<circle cx="10.8" cy="10.8" r="6.6" /><path d="m15.7 15.7 4.8 4.8" />',
  /** The roundel, which is what the rail overlay draws. */
  lines: '<circle cx="12" cy="12" r="7.6" /><path d="M3.6 12h16.8" />',
  /** A sheet with two lines of writing: one record per restaurant. */
  details:
    '<path d="M6.5 3h7l4 4v14h-11Z" /><path d="M13.5 3v4h4" /><path d="M9.5 12.5h5M9.5 16h5" />',
  /** Stacked planes: the vector tiles the basemap is precached as. */
  slab: '<path d="M12 3 3 7.5 12 12l9-4.5Z" /><path d="m3 12 9 4.5L21 12" /><path d="m3 16.5 9 4.5 9-4.5" />',
};

/**
 * The mark for a part, or an empty string for a name that is not one.
 *
 * EMPTY RATHER THAN A THROW, and rather than a default mark. A part with no icon
 * cannot happen — `Part` is the schema's own enum and `MARKS` is typed against it,
 * so the build fails before this runs — and the failure this guards is the other
 * one: `content.points[n].part` reaching here as a plain string from a Variant or
 * a Check. An empty `<svg>` is a missing icon, which is visible; a default mark is
 * the wrong icon, which is not.
 */
export function markFor(part: string): string {
  return (PARTS as readonly string[]).includes(part) ? MARKS[part as Part] : '';
}
