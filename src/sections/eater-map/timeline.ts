import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The **Lift**: the Exploded View going from the flat screenshot to the Slab
 * tilted under one camera with the three Cards standing off its face.
 *
 * ONE NAMED SEEKABLE TIMELINE (ADR 0003), AND IT ANIMATES AWAY FROM THE MARKUP.
 * `--eater-map-lift` rests at 1 in the component's own stylesheet, which is the
 * finished composition — so a reader whose scripts never arrived, and a reader
 * who asked for reduced motion, each keep the Exploded View, and nothing in this
 * Section is contingent on this module turning up. Nothing is hidden here and
 * uncovered later: progress 0 is the composition #176 built, at the same scale,
 * with every Card opaque and every word selectable, and the Timeline's whole job
 * is to travel from there back to where the markup already reads.
 *
 * WHAT THE PROGRESS MEANS. 0 is flat, 1 is raised, and p is p of the way between
 * — the plane finding its angle first and the three Cards climbing after it, in
 * the order the app stacks them. That mapping is fixed and holds at every window,
 * so `seek(0.4)` is a deterministic frame for a Check to read and for the Editor
 * to scrub. Every ease inside it is `none` on purpose: the GEOMETRY is linear in
 * the progress and the FEEL is in the transport below, which is the same split
 * the Front Screen makes — the Timeline is the authority on where the drawing is,
 * and nothing else writes a transform.
 *
 * IT IS PAUSED, ALWAYS. Nothing here plays it; a transport tween moves its
 * playhead, exactly as the Turn's ScrollTrigger scrubs the Kernel's. A Timeline
 * that plays itself cannot be held: `hold()` disables every ScrollTrigger, which
 * stops a scrub dead, and does not touch a `play()` already in the air — so a
 * Check that seeked this to 0.25 would watch it drift back out from under the
 * read. The transport reads the playhead back on every tick and yields the moment
 * it finds a progress it did not write, so a seek is never scrubbed out from under
 * whoever took it. NOTES.md says why no Check catches that guard being removed and
 * why it is here anyway.
 *
 * WHERE IT IS TRIGGERED, AND THE ONE PIXEL THAT MATTERS. The Lift runs when the
 * turn settles on this Section's resting place and reverses if the reader turns
 * back before it finishes — retargeting the transport from wherever the drawing
 * has got to rather than starting again. ARRIVE below carries why the trigger
 * starts two pixels ABOVE the port rather than on it — a fact about ScrollTrigger
 * whose symptom would be a Lift that never fires at all.
 */

/** The plane's own share of the Timeline: it starts turning before anything rises. */
const TILT = 0.55;

/** Where the Cards begin, and how long each one's climb takes. */
const LAG = 0.18;
const RISE = 0.6;

/** Between one Card and the next. Three Cards, so two steps: LAG + RISE + 2 x STAGGER = 1. */
const STAGGER = 0.11;

/**
 * How the playhead travels, which is the feel and not the drawing.
 *
 * `out` rather than `inOut`: the page has just come to rest from a turn, so the
 * pieces should leave the Slab at once and settle rather than gather themselves
 * first.
 */
const EASE = 'power2.out';

/** A thousandth of the Lift is "already there", for either end and for a retarget. */
const SLACK = 0.001;

/**
 * How far above the resting place the Lift is armed, in pixels.
 *
 * NOT A FUDGE, AND NOT A TOKEN. ScrollTrigger's own `isActive` is
 * `progress > 0 && progress < 1` — so a trigger starting exactly ON the port is
 * at progress 0 when the reader is standing on it, is therefore not active, and
 * never fires. The page turn eases onto the port and stops there to the pixel,
 * which is exactly the case that would never fire. Two pixels earlier is two
 * pixels of an 800ms ease and nothing a reader can see.
 */
const ARRIVE = 2;

/** A duration Token, in seconds, written in either `s` or `ms`. */
function seconds(raw: string, fallback: number): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.trim().endsWith('ms') ? value / 1000 : value;
}

export default function mountLift(root: HTMLElement): gsap.core.Timeline | void {
  const plane = root.querySelector<HTMLElement>('[data-eater-map-plane]');
  const cards = [...root.querySelectorAll<HTMLElement>('[data-eater-map-card]')];
  // Nothing to lift. Registering a Timeline anyway would give the `moments` Check
  // one that scrubs perfectly and animates nothing, which is the exact failure it
  // exists to catch — so this Section registers none, as it did before #177.
  if (!plane || cards.length === 0) return;

  gsap.registerPlugin(ScrollTrigger);

  const lift = gsap.timeline({ paused: true });
  lift
    // The Section's own playhead, which the plane's two rotations are written
    // against. On the ROOT and not on the plane, because the Cards read it too:
    // it is the value each Card's own falls back to when nothing has written one.
    .fromTo(
      root,
      { '--eater-map-lift': 0 },
      { '--eater-map-lift': 1, duration: TILT, ease: 'none' },
      0,
    )
    // In document order, which is the order the app stacks them: the detail panel
    // leaves the map first and the search bar last.
    .fromTo(
      cards,
      { '--eater-map-card-lift': 0 },
      { '--eater-map-card-lift': 1, duration: RISE, ease: 'none', stagger: STAGGER },
      LAG,
    );

  const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  // A reader who asked for stillness gets the finished Exploded View and NOTHING
  // MOVES — not even the jump a Lift driven straight to its end would make. So
  // the drawing is put where the markup already had it and no trigger is built at
  // all. The Timeline is still registered and still seekable, because the Editor
  // scrubs it and a reader's setting is not the author's.
  if (lessMotion?.matches === true) {
    lift.progress(1);
    return lift;
  }

  let transport: gsap.core.Tween | null = null;
  const head = { at: 0 };
  /** The last progress this module put on the playhead, read back off it. */
  let wrote = lift.progress();

  function stop(): void {
    transport?.kill();
    transport = null;
  }

  /** Take the drawing to `to`, from wherever it has got to. */
  function drive(to: number): void {
    stop();
    const from = lift.progress();
    const distance = Math.abs(to - from);
    const time = seconds(
      getComputedStyle(root).getPropertyValue('--eater-map-lift-time'),
      1.15,
    );
    if (distance < SLACK || !(time > 0)) {
      lift.progress(to);
      wrote = lift.progress();
      return;
    }
    head.at = from;
    // Where the transport is starting from is also the last progress this module
    // is answerable for. Without this line a transport that yielded once leaves
    // `wrote` behind at wherever it stopped, and the NEXT transport reads that
    // stale number as somebody else's seek and yields on its first tick — a Lift
    // that ran once and then froze for the rest of the session.
    wrote = from;
    // The time spent is the DISTANCE LEFT and not the whole Lift, so a turn back
    // taken a third of the way up undoes a third of a Lift rather than easing for
    // as long as the whole one would have taken.
    transport = gsap.to(head, {
      at: to,
      duration: time * distance,
      ease: EASE,
      onUpdate: () => {
        // SOMETHING ELSE HAS THE PLAYHEAD: a Check seeking a moment, or the
        // Editor scrubbing. This transport is precisely what would scrub it back
        // out from under them, and `hold()` cannot stop it — that disables every
        // ScrollTrigger, which stops a scrub dead and does not touch a tween
        // already in the air. So the transport yields to whoever moved the
        // playhead last, and does not resume on its own: `release()` refreshes
        // every trigger, and the refresh below is what puts the drawing back into
        // the state the scroll asks for.
        if (Math.abs(lift.progress() - wrote) > SLACK) {
          stop();
          return;
        }
        lift.progress(head.at);
        wrote = lift.progress();
      },
      onComplete: () => {
        transport = null;
      },
    });
  }

  /**
   * Is the reader standing on this Section's resting place?
   *
   * Asked of the LIVE SCROLL rather than read off `self.isActive`, because
   * `onRefresh` is called at points in ScrollTrigger's own cycle where `isActive`
   * has not been recomputed — and `onRefresh` is what `release()` runs, so a
   * stale answer there leaves the drawing wherever a Check left it.
   *
   * BOTH COMPARISONS ARE STRICT, AND THE FIRST ONE COST A DIAGNOSIS. This has to
   * be the same question ScrollTrigger asks itself — `progress > 0 && progress < 1`
   * — and at `scroll === start` those differ: ScrollTrigger says NO and `>=` says
   * yes. The leaving toggle is delivered at exactly that position about half the
   * time, and it read as a Lift that reversed on some turns back and ran on to the
   * end on others. Measured: `toggle scroll=1706 start=1706 active=false
   * arrived=true`.
   */
  const arrived = (self: ScrollTrigger) => self.scroll() > self.start && self.scroll() < self.end;

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: `top top+=${ARRIVE}`,
    end: 'bottom top',
    onToggle: (self) => drive(arrived(self) ? 1 : 0),
    // Two things arrive here: a resize, which may have moved the resting place
    // under a Lift that has already run, and `release()`, which is how a Check or
    // the Editor hands the page back after holding it. Both want the same answer
    // — put the drawing where the scroll says it should be.
    onRefresh: (self) => drive(arrived(self) ? 1 : 0),
  });

  // The reader may already be standing here: a deep link to /portfolio/eater-map
  // opens the document at this Section, and this Section mounts after the arrival.
  // `onRefresh` above answers for that in the ordinary case — but ScrollTrigger
  // defers its first refresh in some load orders, and a trigger that has not
  // refreshed has a `start` and an `end` of 0, which reads as "not here". So the
  // question is asked once more now, when the answer is certainly available.
  drive(arrived(trigger) ? 1 : 0);

  return lift;
}
