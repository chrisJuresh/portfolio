# Prose leaves the source; invariants become Checks

The explanatory prose that made up most of this repository's source moves out of
the source. A Section's files keep one-line pointers; the reasoning lives in that
Section's `NOTES.md`, read when a change is behavioural and skipped when it is
not. Anything that was really an **invariant** stops being a comment and becomes
a Check.

This reverses the repository's most visible convention, so it needs its reason
stated. It is not about the cost of reading a file — with caching that is close to
free. It is that `styles.css` was 334 KB, of which 84.6% was prose, and a Section
must fit in a single context window alongside whatever is being built next to it.
Prose in the source competes for room with the work.

## Consequences

The load-bearing knowledge gets *more* reliable, not less. A comment saying "do
not break this" is a wish; a Check that fails is a guarantee. The arc a light
must stay inside to read as a highlight, "the stone stays" — each becomes an
assertion.

The capture geometry was the third example here, and #148 settled it the other
way: it became an assertion in the repository that *depends* on it rather than a
Check here, because it is that consumer's crop and not this composition's
invariant. What became a Check here is the half the capture could never see.

Checks **block** a commit rather than reporting. An advisory check inside an agent
loop is one that gets read and stepped over. The price is that a false positive
costs the author a prompt, so the suite stays small and asserts only things that
cannot fire on a legitimate change.

The external capture of the Portfolio comes off its schedule — a five-minute
poll, described as hourly everywhere until #148 measured it. It asserted geometry
hard and colour not at all, so a theme regression broke it silently; it now runs
when the author asks for it, and the Check that goes with it asserts the ground's
luminance in both themes so that failure is loud.
