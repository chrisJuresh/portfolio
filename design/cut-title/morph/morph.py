"""Correspondence for tweening one setting of PROJECTS onto another.

The first attempt at this matched points by arc length and joined mismatched
contours with a keyhole slit, and it looked wrong in three specific ways. All
three are addressed here.

CORNERS ARE MATCHED TO CORNERS. Sampling two outlines at equal arc length lands
their points in unrelated places -- the corner of an E's arm against the middle
of a curve -- so every corner rounds off on the way and the straight edges
wobble. Here the corners are found on both outlines first, matched to each other
by cyclic dynamic programming, and points are distributed BETWEEN matched
corners. A stem stays straight because both its ends are pinned.

THE BOWL CLOSES, IT DOES NOT UNZIP. Friz Quadrata's P and R have no counter at
all -- the bowl tapers to a point and never reaches the stem -- so a sans P has
one contour more than Friz's. Slitting the sans counter open and joining it to
its outer makes the tween possible and looks like a zip being pulled, which was
the single worst thing about the old version.

What that missed is that Friz's open BAY already is the counter; it is just not
closed. So `open_bay` closes it, with a chord across its mouth: the outer
swallows the bay and the bay becomes a hole bounded by the same chord. The two
chords coincide, so at rest the shape is Friz's own, to the unit -- and the two
sides now have the same contour count, with the tween's job being to close the
mouth. That is what someone would draw.

`seed_inside` is the fallback for a face where that still does not resolve: an
unmatched counter is paired with a copy of itself collapsed to a point. The point
is deliberately NOT the counter's own centre, which for Friz's P sits out in the
open bay -- outside the letter, where a contour is not a hole but a solid blob
under nonzero fill. It goes to the nearest point inside the outline instead.

THE ENDS ARE THE REAL OUTLINES. Whatever the tween does in between, at rest the
word must be the typeface and not a polygon of it, so the true Bezier outlines
are emitted alongside and the page shows those at both ends.
"""
import math

import lib

WORD = lib.WORD
DENSE = 1400          # points per contour before matching; only used for analysis
N = 168               # points per contour in the emitted tween


# ---- basic polygon helpers -------------------------------------------------

def area(c):
    n = len(c)
    return sum(c[i][0]*c[(i+1) % n][1] - c[(i+1) % n][0]*c[i][1] for i in range(n)) / 2


def orient(c, ccw=True):
    return c if (area(c) > 0) == ccw else c[::-1]


def centroid(c):
    a = area(c)
    if abs(a) < 1e-9:
        return (sum(p[0] for p in c)/len(c), sum(p[1] for p in c)/len(c))
    cx = cy = 0.0
    n = len(c)
    for i in range(n):
        x0, y0 = c[i]; x1, y1 = c[(i+1) % n]
        f = x0*y1 - x1*y0
        cx += (x0+x1)*f; cy += (y0+y1)*f
    return (cx/(6*a), cy/(6*a))


def inside(pt, poly):
    x, y = pt; n = len(poly); hit = False
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i+1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (x1-x0) * (y-y0) / (y1-y0):
            hit = not hit
    return hit


def cumlen(c):
    s = [0.0]
    for i in range(len(c)):
        s.append(s[-1] + math.dist(c[i], c[(i+1) % len(c)]))
    return s


def at(c, s, target):
    """Point at arc length `target` around closed polygon c."""
    total = s[-1]
    target %= total
    lo, hi = 0, len(s)-1
    while lo < hi-1:
        mid = (lo+hi)//2
        if s[mid] <= target: lo = mid
        else: hi = mid
    seg = s[lo+1]-s[lo]
    f = (target-s[lo])/seg if seg else 0.0
    p, q = c[lo], c[(lo+1) % len(c)]
    return (p[0]+(q[0]-p[0])*f, p[1]+(q[1]-p[1])*f)


def redistribute(c, n):
    s = cumlen(c)
    return [at(c, s, s[-1]*i/n) for i in range(n)]


# ---- corners ---------------------------------------------------------------

def corners(c, thresh=0.42, window=0.022):
    """Positions (as fractions of perimeter) where the outline turns sharply.

    The turn is measured across a window rather than between neighbouring points,
    so that a flattened curve -- which turns a little at every one of its points
    -- does not register, while a true corner does."""
    n = len(c)
    k = max(2, int(n*window))
    s = cumlen(c); total = s[-1]
    turn = []
    for i in range(n):
        ax = c[i][0]-c[(i-k) % n][0]; ay = c[i][1]-c[(i-k) % n][1]
        bx = c[(i+k) % n][0]-c[i][0]; by = c[(i+k) % n][1]-c[i][1]
        na = math.hypot(ax, ay); nb = math.hypot(bx, by)
        if na < 1e-9 or nb < 1e-9: turn.append(0.0); continue
        cross = (ax*by - ay*bx)/(na*nb)
        dot = (ax*bx + ay*by)/(na*nb)
        turn.append(math.atan2(cross, dot))
    out = []
    for i in range(n):
        t = turn[i]
        if abs(t) < thresh: continue
        if all(abs(turn[(i+d) % n]) <= abs(t) for d in range(-k, k+1)):
            out.append((s[i]/total, t))
    return out


# ---- matching two cyclic feature sequences ---------------------------------

def match(fa, fb, ca, cb):
    """Pair corners of a with corners of b, keeping cyclic order, allowing skips.

    Every rotation of b is tried as a starting alignment, and for each one a
    monotone DP finds the cheapest matching. Corner counts are small -- a capital
    has a handful -- so the whole thing is trivial to run exhaustively."""
    if not fa or not fb: return []
    la, lb = len(fa), len(fb)
    sa = cumlen(ca); sb = cumlen(cb)
    pa = [at(ca, sa, s*sa[-1]) for s, _ in fa]
    pb = [at(cb, sb, s*sb[-1]) for s, _ in fb]
    scale = max(sa[-1], sb[-1]) / 6.0
    SKIP = 0.55

    best = None
    for off in range(lb):
        # cost of pairing fa[i] with fb[(j+off)%lb]
        def c(i, j):
            k = (j+off) % lb
            ds = abs(((fa[i][0]-fb[k][0]) - (fa[0][0]-fb[off][0]) + .5) % 1.0 - .5)
            dp = math.dist(pa[i], pb[k]) / scale
            da = abs(fa[i][1]-fb[k][1]) / math.pi
            return 1.4*ds + 1.0*dp + 0.6*da
        D = [[math.inf]*(lb+1) for _ in range(la+1)]
        P = [[None]*(lb+1) for _ in range(la+1)]
        D[0][0] = 0.0
        for i in range(la+1):
            for j in range(lb+1):
                if D[i][j] == math.inf: continue
                if i < la and j < lb:
                    v = D[i][j] + c(i, j)
                    if v < D[i+1][j+1]: D[i+1][j+1] = v; P[i+1][j+1] = (i, j, True)
                if i < la and D[i][j]+SKIP < D[i+1][j]:
                    D[i+1][j] = D[i][j]+SKIP; P[i+1][j] = (i, j, False)
                if j < lb and D[i][j]+SKIP < D[i][j+1]:
                    D[i][j+1] = D[i][j]+SKIP; P[i][j+1] = (i, j, False)
        if best is None or D[la][lb] < best[0]:
            pairs, i, j = [], la, lb
            while P[i][j]:
                pi, pj, kept = P[i][j]
                if kept: pairs.append((pi, (pj+off) % lb))
                i, j = pi, pj
            best = (D[la][lb], sorted(pairs))
    return best[1]


def correspond(ca, cb, n=N):
    """n points on each of ca and cb, index i on one meaning index i on the other."""
    ca, cb = redistribute(ca, DENSE), redistribute(cb, DENSE)
    fa, fb = corners(ca), corners(cb)
    pairs = match(fa, fb, ca, cb)
    sa, sb = cumlen(ca), cumlen(cb)

    if len(pairs) < 2:                                   # smooth pair, e.g. an O
        ra = redistribute(ca, n)
        rb = redistribute(cb, n)
        best, bo = None, 0
        for o in range(n):
            d = sum((ra[i][0]-rb[(i+o) % n][0])**2 + (ra[i][1]-rb[(i+o) % n][1])**2
                    for i in range(n))
            if best is None or d < best: best, bo = d, o
        return ra, rb[bo:] + rb[:bo]

    anchors = [(fa[i][0]*sa[-1], fb[j][0]*sb[-1]) for i, j in pairs]
    spans = []
    for k in range(len(anchors)):
        a0, b0 = anchors[k]
        a1, b1 = anchors[(k+1) % len(anchors)]
        da = (a1-a0) % sa[-1] or sa[-1]
        db = (b1-b0) % sb[-1] or sb[-1]
        spans.append((a0, da, b0, db))
    weight = [(da/sa[-1] + db/sb[-1])/2 for _, da, _, db in spans]
    tot = sum(weight) or 1.0
    counts = [max(1, round(n*w/tot)) for w in weight]
    while sum(counts) > n: counts[counts.index(max(counts))] -= 1
    while sum(counts) < n: counts[counts.index(max(counts))] += 1

    ra, rb = [], []
    for (a0, da, b0, db), m in zip(spans, counts):
        for i in range(m):
            f = i/m
            ra.append(at(ca, sa, a0 + da*f))
            rb.append(at(cb, sb, b0 + db*f))
    return ra, rb


# ---- opening a bay into a counter -----------------------------------------

def open_bay(c, want, min_share=0.02, stride=4, look=600):
    """Split a contour with an open bay into a filled outer and the bay as a hole.

    Friz Quadrata's P and R have no counter: the bowl tapers to a point and never
    reaches the stem, so what a sans draws as an outer plus a counter is one
    contour here, with a bay open to the outside.

    The bay is closed off with a chord across its mouth. The outer gets the chord
    and swallows the bay; the bay becomes a hole bounded by the same chord. The
    two chords coincide exactly, so under nonzero fill the bay stays unfilled and
    the shape at rest is Friz's own -- but the tween now has two contours against
    the sans's two, and what it has to do is CLOSE THE MOUTH, which is what a
    designer would draw, rather than unzip a slit.

    `want` is the centre of the counter this bay has to become, and it is not
    optional. A letter has several places where its outline nearly touches itself
    across white -- every concave serif notch is one, and the notch under a P's
    foot is a NARROWER gap than the mouth of its bowl, so the closest pair finds
    the serif every time. The closest pair whose bay contains the counter finds
    the bowl.

    Everything happens on a UNIFORMLY resampled copy. The outline as drawn has a
    hundred points around a curve and two down a straight stem, so an index into
    it says nothing about position, and a coarse search cannot be mapped back
    onto it by proximity -- both ends of the mouth land on the same vertex of the
    nearest long edge."""
    d = redistribute(c, DENSE)
    k = d[::stride]
    n = len(k)
    gap = max(3, n//10)
    pairs = sorted((((k[i][0]-k[j][0])**2 + (k[i][1]-k[j][1])**2), i, j)
                   for i in range(n) for j in range(i+gap, n-gap if i < gap else n))
    outer_area = abs(area(k))
    for _, i, j in pairs[:look]:
        mid = ((k[i][0]+k[j][0])/2, (k[i][1]+k[j][1])/2)
        if inside(mid, k): continue                    # a waisted stroke, not a bay
        bay, outer = k[i:j+1], k[j:] + k[:i+1]
        if abs(area(bay)) > abs(area(outer)): bay, outer = outer, bay
        if abs(area(bay)) < min_share*outer_area: continue
        if inside(centroid(bay), k): continue
        if not inside(want, bay): continue
        pi, pj = i*stride, j*stride
        bay, outer = d[pi:pj+1], d[pj:] + d[:pi+1]
        if abs(area(bay)) > abs(area(outer)): bay, outer = outer, bay
        if len(bay) < 8 or len(outer) < 8: continue
        return [orient(outer, True), orient(bay, False)]
    return None


# ---- putting a letter together --------------------------------------------

def seed_inside(counter, outer_from):
    """Where a counter that does not exist yet should open from.

    Its own centre is no good: for Friz's P that point lies in the open bay,
    outside the letter, and a contour outside its outer fills solid instead of
    cutting a hole. So: the nearest point on the outline it has to appear in,
    stepped inwards until it is genuinely inside."""
    c = centroid(counter)
    if inside(c, outer_from): return c
    near = min(outer_from, key=lambda p: math.dist(p, c))
    cx, cy = centroid(outer_from)
    vx, vy = cx-near[0], cy-near[1]
    d = math.hypot(vx, vy) or 1.0
    for step in (0.04, 0.08, 0.15, 0.25, 0.4):
        p = (near[0]+vx/d*d*step, near[1]+vy/d*d*step)
        if inside(p, outer_from): return p
    return (cx, cy)


def pair_letter(fa, fb, n=N):
    """Contours of one letter in both faces, paired and point-matched."""
    fa = sorted(fa, key=lambda c: -abs(area(c)))
    fb = sorted(fb, key=lambda c: -abs(area(c)))
    if len(fa) < len(fb) and len(fa) == 1:
        split = open_bay(fa[0], centroid(fb[1]))
        if split: fa = split
    if len(fb) < len(fa) and len(fb) == 1:
        split = open_bay(fb[0], centroid(fa[1]))
        if split: fb = split
    fa = [orient(c, i == 0) for i, c in enumerate(fa)]
    fb = [orient(c, i == 0) for i, c in enumerate(fb)]

    A, B = [], []
    outer_a, outer_b = fa[0], fb[0]
    ra, rb = correspond(outer_a, outer_b, n)
    A.append(ra); B.append(rb)

    rest_a, rest_b = fa[1:], fb[1:]
    used = set()
    for ca in rest_a:                       # pair counters by nearest centre
        if rest_b:
            j = min((j for j in range(len(rest_b)) if j not in used),
                    key=lambda j: math.dist(centroid(ca), centroid(rest_b[j])),
                    default=None)
        else:
            j = None
        if j is None:                       # a counter with nowhere to go: shrink it
            s = seed_inside(ca, outer_b)
            r = redistribute(ca, n)
            A.append(r); B.append([s]*n)
        else:
            used.add(j)
            x, y = correspond(ca, rest_b[j], n)
            A.append(x); B.append(y)
    for j, cb in enumerate(rest_b):         # a counter that has to grow in
        if j in used: continue
        s = seed_inside(cb, outer_a)
        r = redistribute(cb, n)
        A.append([s]*n); B.append(r)
    return A, B


def emit(cs, decimals=0):
    f = lambda v: f"{round(v, decimals):g}"
    return "".join("M" + f(c[0][0]) + " " + f(c[0][1]) +
                   "".join("L" + f(p[0]) + " " + f(p[1]) for p in c[1:]) + "Z"
                   for c in cs)


def word_polys(m, flip_top):
    out = {}
    for ch in WORD:
        k, ox = m["k"], m["origin"][ch]
        out[ch] = [[(p[0]*k + ox, flip_top - p[1]*k) for p in c] for c in m["polys"][ch]]
    return out


def true_path(m, flip_top, decimals=1):
    """The real outlines, Beziers and all -- what the page shows at rest."""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.misc.transform import Transform
    from fontTools.ttLib import TTFont
    f = lib.instance(TTFont(m["path"], fontNumber=0, lazy=False), m["wght"])
    gs = f.getGlyphSet()
    out = {}
    for ch in WORD:
        pen = SVGPathPen(gs, ntos=lambda v: f"{round(v, decimals):g}")
        t = Transform(m["k"], 0, 0, -m["k"], m["origin"][ch], flip_top)
        lib.simplified(gs, m["cmap"][ch]).draw(TransformPen(pen, t))
        out[ch] = pen.getCommands()
    return out


def build(a, b, flip_top, n=N):
    """Everything the page needs for one face: per-letter tween ends and true ends."""
    pa, pb = word_polys(a, flip_top), word_polys(b, flip_top)
    letters = []
    for ch in WORD:
        A, B = pair_letter(pa[ch], pb[ch], n)
        letters.append(dict(ch=ch, a=emit(A), b=emit(B)))
    return letters
