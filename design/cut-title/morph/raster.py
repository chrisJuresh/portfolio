"""Scanline rasteriser with NONZERO winding, for checking the morph by eye.

PIL's own polygon fill is even-odd, which would punch holes wherever the union
of overlapping contours is supposed to be solid -- exactly the case the stitcher
exists to handle -- so it cannot be used to verify the stitcher. This does the
same fill rule the browser will."""
from PIL import Image


def parse(d):
    out, cur = [], None
    i, n = 0, len(d)
    while i < n:
        c = d[i]
        if c in "MLZ":
            if c == "Z": cur = None
            else:
                j = i + 1
                k = d.find("M", j); l = d.find("L", j); m = d.find("Z", j)
                e = min(x for x in (k, l, m, n) if x != -1)
                x, y = d[j:e].split(" ")
                if c == "M": cur = [(float(x), float(y))]; out.append(cur)
                else: cur.append((float(x), float(y)))
                i = e; continue
        i += 1
    return out


def render(paths, w, h, sx, sy, ss=3):
    W, H = w*ss, h*ss
    img = Image.new("L", (W, H), 0)
    px = img.load()
    edges = []
    for c in paths:
        for a, b in zip(c, c[1:] + [c[0]]):
            ax, ay = a[0]*sx*ss, a[1]*sy*ss
            bx, by = b[0]*sx*ss, b[1]*sy*ss
            if ay != by: edges.append((ax, ay, bx, by))
    for Y in range(H):
        y = Y + 0.5
        xs = []
        for ax, ay, bx, by in edges:
            if (ay <= y < by) or (by <= y < ay):
                xs.append((ax + (bx-ax)*(y-ay)/(by-ay), 1 if by > ay else -1))
        if not xs: continue
        xs.sort()
        wind = 0
        for (x0, d0), (x1, _) in zip(xs, xs[1:]):
            wind += d0
            if wind != 0:
                for X in range(max(0, int(x0)), min(W, int(x1)+1)): px[X, Y] = 255
    return img.resize((w, h), Image.LANCZOS)
