"""Tiny vector toolkit for the Local Host logo concepts.

- shapes are skia-pathops Paths (boolean ops, strokes)
- text is shaped with HarfBuzz (kerning, variable weights) and outlined to paths
- output is flat, overlap-free SVG paths grouped per colour
"""
import math, os, tempfile
from collections import OrderedDict
import pathops
from pathops import Path, PathOp, LineCap, LineJoin
import uharfbuzz as hb
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
NM = os.path.join(REPO, 'node_modules')
# fonts come from the @fontsource packages already installed in the repo
FONT_SOURCES = {
    'fraunces': '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
    'manrope': '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    'outfit': '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2',
    'unbounded': '@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2',
    'jakarta': '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
    'notosansgeo': '@fontsource-variable/noto-sans-georgian/files/noto-sans-georgian-georgian-wght-normal.woff2',
    'dmsans': '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
    'spacegrotesk': '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
    'inter': '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
}
FONTS = os.environ.get('LOGO_FONT_CACHE') or os.path.join(tempfile.gettempdir(), 'localhost-logo-fonts')


def _font_file(name):
    """woff2 from node_modules -> cached TTF (HarfBuzz/fontTools want plain sfnt)."""
    out = os.path.join(FONTS, name + '.ttf')
    if not os.path.exists(out):
        from fontTools.ttLib import TTFont
        os.makedirs(FONTS, exist_ok=True)
        f = TTFont(os.path.join(NM, FONT_SOURCES[name]))
        f.flavor = None
        f.save(out)
    return out

# ---------------------------------------------------------------- geometry

def P(d):
    """SVG path data -> pathops Path"""
    p = Path()
    parse_path(d, p.getPen())
    return p


def circle(cx, cy, r):
    k = 0.5522847498 * r
    p = Path()
    p.moveTo(cx + r, cy)
    p.cubicTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r)
    p.cubicTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy)
    p.cubicTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r)
    p.cubicTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy)
    p.close()
    return p


def ellipse(cx, cy, rx, ry):
    return circle(0, 0, 1).transform(rx, 0, 0, ry, cx, cy)


def rect(x, y, w, h, r=0):
    if r <= 0:
        return P(f'M{x} {y}H{x+w}V{y+h}H{x}Z')
    r = min(r, w / 2, h / 2)
    return P(f'M{x+r} {y}H{x+w-r}A{r} {r} 0 0 1 {x+w} {y+r}V{y+h-r}A{r} {r} 0 0 1 {x+w-r} {y+h}'
             f'H{x+r}A{r} {r} 0 0 1 {x} {y+h-r}V{y+r}A{r} {r} 0 0 1 {x+r} {y}Z')


def poly(pts, close=True):
    p = Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    return p


def stroke(pts, width, cap='round', join='round', miter=4, closed=False):
    p = Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if closed:
        p.close()
    caps = {'round': LineCap.ROUND_CAP, 'butt': LineCap.BUTT_CAP, 'square': LineCap.SQUARE_CAP}
    joins = {'round': LineJoin.ROUND_JOIN, 'miter': LineJoin.MITER_JOIN, 'bevel': LineJoin.BEVEL_JOIN}
    p.stroke(width, caps[cap], joins[join], miter)
    p.convertConicsToQuads()
    p.simplify()
    return p


def outline(path, width, join='round'):
    """Return the stroked outline of a closed path (used to make separation gaps)."""
    q = Path()
    q.addPath(path)
    joins = {'round': LineJoin.ROUND_JOIN, 'miter': LineJoin.MITER_JOIN}
    q.stroke(width, LineCap.ROUND_CAP, joins[join], 4)
    q.convertConicsToQuads()
    q.simplify()
    return q


def U(*ps):
    out = Path()
    ps = [p for p in ps if p is not None]
    if not ps:
        return out
    out = ps[0]
    for p in ps[1:]:
        out = pathops.op(out, p, PathOp.UNION)
    return out


def D(a, *bs):
    out = a
    for b in bs:
        if b is not None:
            out = pathops.op(out, b, PathOp.DIFFERENCE)
    return out


def I(a, b):
    return pathops.op(a, b, PathOp.INTERSECTION)


def T(p, s=1, tx=0, ty=0, sx=None, sy=None):
    sx = s if sx is None else sx
    sy = s if sy is None else sy
    return p.transform(sx, 0, 0, sy, tx, ty)


def R(p, deg, cx=0, cy=0):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    # translate(-cx,-cy) rotate translate(cx,cy)
    return p.transform(c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy)


def mirror_x(p, axis):
    return p.transform(-1, 0, 0, 1, 2 * axis, 0)


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)


def pin(cx, cy, r, tip_y, tip_round=0.0):
    """Classic map pin: circle (cx,cy,r) + tangents meeting at a (softly rounded) tip (cx, tip_y)."""
    d = tip_y - cy
    sa = r / d                      # sin of the tip half-angle
    ca = math.sqrt(1 - sa * sa)
    # tangent points on the circle
    tx = r * ca
    ty = cy + r * sa
    if tip_round > 0:
        rr = tip_round
        ccy = tip_y - rr / sa       # centre of tip-rounding circle
        # tangent points of the small circle with the two edges
        px = rr * ca
        py = ccy + rr * sa
        dd = (f'M{cx - tx} {ty}A{r} {r} 0 1 1 {cx + tx} {ty}L{cx + px} {py}'
              f'A{rr} {rr} 0 0 1 {cx - px} {py}Z')
    else:
        dd = f'M{cx - tx} {ty}A{r} {r} 0 1 1 {cx + tx} {ty}L{cx} {tip_y}Z'
    return P(dd)


def clean(p, ratio=0.01):
    """Drop sliver contours left over by boolean ops (tiny area relative to their extent)."""
    out = Path()
    for c in p.contours:
        x0, y0, x1, y1 = c.bounds
        diag2 = (x1 - x0) ** 2 + (y1 - y0) ** 2
        if diag2 == 0 or abs(c.area) / diag2 < ratio:
            continue
        out.addPath(c)
    return out


# ---------------------------------------------------------------- text

_fonts = {}


def get_font(name, wght=None):
    key = (name, wght)
    if key not in _fonts:
        blob = hb.Blob.from_file_path(_font_file(name))
        face = hb.Face(blob)
        font = hb.Font(face)
        if wght is not None:
            font.set_variations({'wght': wght})
        _fonts[key] = (font, face.upem)
    return _fonts[key]


OPTICAL_KERN = {('L', 'O'): -0.045, ('A', 'L'): -0.025, ('C', 'A'): -0.012, ('L', ' '): -0.03}


def shape(fontname, s, size, wght=None, tracking=0.0, features=None, kern=True, adj=None):
    """Return list of glyphs [{'gid','x','adv','char'}] (in px at `size`) and total width."""
    font, upem = get_font(fontname, wght)
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    feats = dict(features or {})
    if not kern:
        feats['kern'] = False
    hb.shape(font, buf, feats)
    sc = size / upem
    out = []
    x = 0.0
    infos, poss = buf.glyph_infos, buf.glyph_positions
    for i, (inf, pos) in enumerate(zip(infos, poss)):
        g = {'gid': inf.codepoint, 'x': x + pos.x_offset * sc, 'y': -pos.y_offset * sc,
             'adv': pos.x_advance * sc, 'cluster': inf.cluster, 'char': s[inf.cluster]}
        out.append(g)
        x += pos.x_advance * sc
        if i < len(infos) - 1:
            x += tracking * size
            if adj:
                nxt = s[infos[i + 1].cluster]
                x += adj.get((g['char'], nxt), 0.0) * size
    return out, x


def glyph_path(fontname, gid, size, wght=None):
    font, upem = get_font(fontname, wght)
    sc = size / upem
    p = Path()
    pen = TransformPen(p.getPen(), (sc, 0, 0, -sc, 0, 0))
    font.draw_glyph_with_pen(gid, pen)
    p.simplify()
    return p


def text(fontname, s, size, wght=None, tracking=0.0, x=0, y=0, anchor='start', features=None,
         skip=(), kern=True, return_glyphs=False, adj=None):
    """Outline a line of text. Baseline at y. Returns (path, width[, glyphs])."""
    glyphs, w = shape(fontname, s, size, wght, tracking, features, kern, adj)
    if anchor == 'middle':
        x0 = x - w / 2
    elif anchor == 'end':
        x0 = x - w
    else:
        x0 = x
    out = Path()
    for i, g in enumerate(glyphs):
        g['x'] += x0
        if i in skip:
            continue
        gp = glyph_path(fontname, g['gid'], size, wght)
        out.addPath(T(gp, 1, g['x'], y + g['y']))
    out.simplify()
    if return_glyphs:
        return out, w, glyphs
    return out, w


def text_on_circle(fontname, s, size, cx, cy, r, center_deg, wght=None, tracking=0.0,
                   bottom=False, r_measure=None):
    """Set text along a circle. Top text: baseline on radius r, letters point outward,
    reads clockwise, centred at center_deg (screen degrees, -90 = 12 o'clock).
    Bottom text: baseline on radius r (outer), tops point to centre, reads left->right."""
    glyphs, w = shape(fontname, s, size, wght, tracking)
    rm = r_measure or r
    total_ang = w / rm
    out = Path()
    for g in glyphs:
        gp = glyph_path(fontname, g['gid'], size, wght)
        mid = g['x'] + g['adv'] / 2
        if not bottom:
            ang = math.radians(center_deg) - total_ang / 2 + mid / rm
            rot = math.degrees(ang) + 90
        else:
            ang = math.radians(center_deg) + total_ang / 2 - mid / rm
            rot = math.degrees(ang) - 90
        local = T(gp, 1, -g['adv'] / 2, 0)
        local = R(local, rot)
        px, py = cx + r * math.cos(ang), cy + r * math.sin(ang)
        out.addPath(T(local, 1, px, py))
    out.simplify()
    return out


# ---------------------------------------------------------------- output

def fmt(v, prec=2):
    s = f'{v:.{prec}f}'.rstrip('0').rstrip('.')
    if s in ('-0', ''):
        s = '0'
    return s


def d_of(p, prec=2):
    pen = SVGPathPen(None, ntos=lambda v: fmt(v, prec))
    p.draw(pen)
    return pen.getCommands()


def flatten(layers):
    """layers: bottom->top list of (colour|None, Path). None = knockout (transparent).
    Returns OrderedDict colour->Path with no overlaps (visible areas only)."""
    cover = None
    vis = []
    for col, p in reversed(layers):
        v = p if cover is None else D(p, cover)
        vis.append((col, v))
        cover = p if cover is None else U(cover, p)
    merged = OrderedDict()
    for col, v in reversed(vis):
        if col is None:
            continue
        merged[col] = v if col not in merged else U(merged[col], v)
    return merged


def svg(layers, title, pad=0, box=None, prec=2, width=None):
    flat = flatten(layers)
    if box is None:
        allp = U(*flat.values())
        x0, y0, x1, y1 = allp.bounds
        box = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    bx, by, bw, bh = box
    # shift so the viewBox starts at 0 0 (cleaner numbers)
    parts = []
    for col, p in flat.items():
        q = T(clean(p), 1, -bx, -by)
        dd = d_of(q, prec)
        if dd:
            parts.append(f'<path fill="{col}" d="{dd}"/>')
    vb = f'0 0 {fmt(bw)} {fmt(bh)}'
    wattr = ''
    if width:
        wattr = f' width="{fmt(width)}" height="{fmt(width * bh / bw)}"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{wattr} role="img" aria-label="{title}">'
            f'<title>{title}</title>' + ''.join(parts) + '</svg>\n')


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)


def text_fit(fontname, s, width, wght=None, tracking=0.2):
    """Outline `s` with the given tracking, sized so its ink width equals `width` exactly."""
    p, _ = text(fontname, s, 100, wght=wght, tracking=tracking)
    b = p.bounds
    size = 100 * width / (b[2] - b[0])
    p, _ = text(fontname, s, size, wght=wght, tracking=tracking)
    return p
