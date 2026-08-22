# A Timeline is the seam for motion

A Section's motion is authored as one named, seekable Timeline — GSAP, with
ScrollTrigger for scroll-driven choreography — and never as a bare
`requestAnimationFrame` loop reading wall-clock time.

The reason is not the easing library. It is that a named Timeline can be **asked
for a given moment**: `seek(0.34)` produces a deterministic frame, which is the
only way a headless Check can assert choreography, and the only way the Editor
can scrub. Motion written as a per-frame loop has no such handle, and motion
written as bare CSS can be seeked but cannot say *which* choreography is being
looked at.

## Consequences

This is the seam `/to-spec` should nominate for any Section with motion, and it
is why a Check can assert "this element is at this coordinate at t=340ms" rather
than asserting nothing about motion at all.

Cheap ambient motion may still be native CSS scroll-driven animation where no
Check needs to see it. Browser parity is explicitly not required.

Judgement of how motion *feels* stays with the author. Multimodal review of
motion was measured and rejected: usefully reading a sequence needs upward of
thirty sampled frames — tens of thousands of tokens — to reach a verdict worse
than the author's eye, while reading the Timeline's own numbers costs almost
nothing.
