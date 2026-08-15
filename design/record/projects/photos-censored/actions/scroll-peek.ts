/**
 * Scroll down a little and back up: enough of the grid moves past to show what
 * the page is, and it returns to where it started so the clip loops without a
 * snap. The Holds at either end are what make the loop read as a pause rather
 * than a stutter.
 *
 * The same motion as record's own `photos` scroll-peek, because the roll was
 * collected over exactly this travel and a different one passes over
 * photographs nobody reviewed.
 *
 * WHY IT IMPORTS NOTHING, AND IS STILL A .ts FILE
 * ------------------------------------------------
 * record loads an Action by importing the module (its ADR 0004), and its own
 * Actions build their Timeline with the `motion()` builder from `@record/core`.
 * That package resolves from record's checkout and this workspace is not in it,
 * so an import here would fail at load — and a `node_modules` planted in this
 * repository to make one resolve would be a build step in a repository whose
 * whole claim is that it has none.
 *
 * A Timeline is plain data — `{ framerate, startsAt, segments }`, see record's
 * packages/core/src/timeline.ts — and `motion()` is a builder that appends to
 * `segments` and hands the same object back. So the chain is written out here
 * instead. It is the same restating-rather-than-importing that
 * design/tools/collect-roll.mjs does with the geometry, for the same reason and
 * with the same cost: this can go stale against record, and nothing here would
 * know. What catches it is that record refuses a Timeline it cannot evaluate.
 *
 * The file is named .ts because that is what `actionModule` looks for, and it
 * is written in the subset that is also plain JavaScript so that nothing has to
 * strip types out of it on the way in.
 */

const parameters = {
  holdIn: {
    kind: "number",
    describes: "Still at the top before anything moves, in milliseconds",
    default: 400,
    min: 0,
    max: 2000,
  },
  distance: {
    kind: "number",
    describes: "How far down the page travels, in CSS pixels",
    default: 180,
    min: 20,
    max: 2000,
  },
  travel: {
    kind: "number",
    describes: "How long each leg of the travel takes, in milliseconds",
    default: 900,
    min: 100,
    max: 5000,
  },
  holdMid: {
    kind: "number",
    describes: "Still at the far end before turning back, in milliseconds",
    default: 250,
    min: 0,
    max: 2000,
  },
  holdOut: {
    kind: "number",
    describes: "Still at the top again once it has returned, in milliseconds",
    default: 400,
    min: 0,
    max: 2000,
  },
  framerate: {
    kind: "number",
    describes: "Frames per second",
    default: 60,
    min: 10,
    max: 120,
  },
  easing: {
    kind: "easing",
    describes: "How the travel accelerates and settles",
    default: "ease-in-out-cubic",
  },
};

const scrollPeek = {
  parameters,
  timeline({ holdIn, distance, travel, holdMid, holdOut, framerate, easing }) {
    return {
      framerate,
      startsAt: { scrollTop: 0, cursor: null },
      segments: [
        { kind: "hold", durationMs: holdIn },
        { kind: "scroll-to", scrollTop: distance, durationMs: travel, easing },
        { kind: "hold", durationMs: holdMid },
        { kind: "scroll-to", scrollTop: 0, durationMs: travel, easing },
        { kind: "hold", durationMs: holdOut },
      ],
    };
  },
};

export default scrollPeek;
