"""Build every SVG of the chosen Local Host logo (3 colour options), the website brand files
and the favicon.

    pip install fonttools brotli uharfbuzz skia-pathops
    python3 design/logo/chosen/source/build.py          # SVGs
    python3 design/logo/chosen/source/page.py           # presentation page (index.html)

Geometry lives in mark.py (12 x 12 grid), colours in OPTIONS below. Text is Outfit (variable,
from node_modules/@fontsource-variable/outfit), shaped with HarfBuzz (GPOS kerning + a few
optical pairs) and converted to outlines, so no SVG needs a font.
"""
import os
import sys
import json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import T, U as UNION, text, d_of, fmt, write, REPO
from mark import Mark
import colour as C

OUT = os.path.abspath(os.path.join(HERE, '..'))
SITE = os.path.join(REPO, 'src', 'assets', 'brand')
FAVICON = os.path.join(REPO, 'public', 'favicon.svg')

UNIT = 10.0        # one grid unit in SVG user units: the mark is 12 x 12 units = 120 x 120
GRIDPX = 12 * UNIT
FONT = 'outfit'
CREAM, FOREST, WHITE = '#F7F3EA', '#0D3A24', '#FFFFFF'
LIGHT_DEG = 45     # every gradient runs from top-left (light) to bottom-right (dark)

# ------------------------------------------------------------------------------ palettes
# Each piece: (light end, flat / mid, dark end). The flat colour is the gradient's middle
# stop, so the flat and gradient versions read as the same colour at small sizes.
OPTIONS = {
    1: dict(
        slug='option-1', name='Modern & Confident',
        note='Light-green front-left hill, deep green right hill, darker overlap; bold wordmark.',
        sun=('#F2643B', '#D9381F', '#B6161B'),
        left=('#6AA758', '#57994D', '#458A45'),
        right=('#2A7B46', '#156B3D', '#055A36'),
        overlap=('#0F653C', '#0A5A37', '#044C31'),
        ink='#122726', accent='#C93226',
        word_w=700, geo_w=620, track=0.008, geo_track=0.36,
    ),
    2: dict(
        slug='option-2', name='Balanced & Versatile',
        note='Dark left hill, bright right hill, mid-green overlap; heavier wordmark. Used on the website.',
        sun=('#F57045', '#DC341F', '#BC171D'),
        left=('#126A42', '#0E643D', '#0A5836'),
        right=('#2AA563', '#189659', '#0F884F'),
        overlap=('#178A53', '#138450', '#0F7848'),
        ink='#0D2524', accent='#C72F25',
        word_w=650, geo_w=600, track=0.015, geo_track=0.38,
    ),
    3: dict(
        slug='option-3', name='Refined & Distinctive',
        note='Earthy olive and pine greens, terracotta GEORGIA; lighter, more open wordmark.',
        sun=('#F7804B', '#E0552C', '#BC2F1C'),
        left=('#8AAB61', '#789E56', '#64904B'),
        right=('#3D7340', '#265F37', '#164F2D'),
        overlap=('#2A6237', '#1C532F', '#124527'),
        ink='#0B1F17', accent='#A15F3F',
        word_w=500, geo_w=520, track=0.045, geo_track=0.42,
    ),
}

# Reverse (dark green background): the sun keeps its colour; the greens are lifted in OKLCH
# lightness (and a little chroma) so the darkest hill still separates from Forest #0D3A24;
# LOCAL HOST turns cream and GEORGIA takes a lighter, warmer red.
REV_SHIFT = {   # piece: (delta OKLCH lightness, chroma multiplier)
    1: dict(left=(0.04, 1.05), right=(0.13, 1.12), overlap=(0.12, 1.12)),
    2: dict(left=(0.13, 1.18), right=(0.10, 1.10), overlap=(0.08, 1.12)),
    3: dict(left=(0.03, 1.05), right=(0.14, 1.12), overlap=(0.13, 1.12)),
}
REV_ACCENT = {1: '#F2704A', 2: '#F57A52', 3: '#E39A71'}


def reverse_palette(opt, n):
    out = dict(opt)
    for k, (dl, cm) in REV_SHIFT[n].items():
        out[k] = tuple(C.shift(c, dl, cm) for c in opt[k])
    out['ink'] = CREAM
    out['accent'] = REV_ACCENT[n]
    return out


# ------------------------------------------------------------------------------ text
OPTICAL = {  # extra pair spacing in em, on top of Outfit's own GPOS kerning
    ('L', ' '): 0.0, (' ', 'H'): 0.06,     # a slightly wider word space than Outfit's default
    ('C', 'A'): -0.008, ('A', 'L'): -0.004, ('S', 'T'): -0.006,
    ('E', 'O'): -0.05, ('R', 'G'): -0.03, ('I', 'A'): -0.06, ('G', 'I'): 0.01,
}


def cap_ratio(wght):
    h, _ = text(FONT, 'H', 1000, wght=wght)
    return (h.bounds[3] - h.bounds[1]) / 1000


def set_line(s, cap, wght, tracking):
    """Outline a line so that its cap height is `cap`; returns path with ink box at (0, 0)."""
    size = cap / cap_ratio(wght)
    p, _ = text(FONT, s, size, wght=wght, tracking=tracking, adj=OPTICAL)
    x0, y0, x1, y1 = p.bounds
    # baseline is y = 0 in `text`; keep the baseline, move ink-left to x = 0
    p = T(p, 1, -x0, 0)
    return p, x1 - x0


# ------------------------------------------------------------------------------ mark output
def grad_vec(box, deg=LIGHT_DEG):
    """Gradient vector across `box` at `deg` (45 = from top-left to bottom-right)."""
    import math
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    proj = [(x - cx) * dx + (y - cy) * dy for x in (x0, x1) for y in (y0, y1)]
    a, b = min(proj), max(proj)
    return (cx + a * dx, cy + a * dy, cx + b * dx, cy + b * dy)


MONO_GAP = 0.3   # knockout gap between the hill planes in one-colour versions, in grid units


def mark_svg(m, pal, mode, prefix, dx, dy):
    """Return (defs, elements) for the mark. mode: grad | flat | mono (pal['ink'] = colour)."""
    defs, els = [], []
    cx, cy, r = m.sun(dx, dy)
    if mode == 'mono':
        col = pal['ink']
        els.append(f'<path fill="{col}" d="{m.d_mono(MONO_GAP * m.u, dx, dy)}"/>')
        els.append(f'<circle fill="{col}" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}"/>')
        return defs, els
    # underlay = whole silhouette in the overlap colour, then the two single-hill planes on top:
    # every internal edge is then a clean two-colour edge (no light seams between abutting shapes)
    pieces = [('overlap', m.d_hills(dx, dy), m.box('overlap')),
              ('left', m.d_left_only(dx, dy), m.box('left')),
              ('right', m.d_right_only(dx, dy), m.box('right')),
              ('sun', None, m.box('sun'))]
    for key, d, box in pieces:
        if mode == 'grad':
            gid = f'{prefix}-{key}'
            x1, y1, x2, y2 = grad_vec((box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy))
            stops = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in zip(('0', '.5', '1'), pal[key]))
            defs.append(f'<linearGradient id="{gid}" x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" '
                        f'gradientUnits="userSpaceOnUse">{stops}</linearGradient>')
            fill = f'url(#{gid})'
        else:
            fill = pal[key][1]
        if d is None:
            els.append(f'<circle fill="{fill}" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}"/>')
        else:
            els.append(f'<path fill="{fill}" d="{d}"/>')
    return defs, els


# ------------------------------------------------------------------------------ lockups
STACK = dict(gap_mark=1.6, cap=2.1, gap_line=1.08, geo_cap=1.15)
HORIZ = dict(gap=2.0, cap=3.75, gap_line=1.5, geo_cap=1.95, geo_track=0.82)  # LOCAL HOST baseline = ridge line


def layout(opt, kind, pal):
    """Place the mark (at the origin) and the text. Returns (mark, [(colour, Path)], bbox)."""
    u = UNIT
    m = Mark(u=u)
    txt = []
    if kind == 'stacked':
        s = STACK
        lh, lw = set_line('LOCAL HOST', s['cap'] * u, opt['word_w'], opt['track'])
        geo, gw = set_line('GEORGIA', s['geo_cap'] * u, opt['geo_w'], opt['geo_track'])
        base1 = m.base + (s['gap_mark'] + s['cap']) * u
        base2 = base1 + (s['gap_line'] + s['geo_cap']) * u
        txt.append(('ink', T(lh, 1, m.cx - lw / 2, base1)))
        txt.append(('accent', T(geo, 1, m.cx - gw / 2, base2)))
    elif kind == 'horizontal':
        s = HORIZ
        lh, lw = set_line('LOCAL HOST', s['cap'] * u, opt['word_w'], opt['track'])
        geo, gw = set_line('GEORGIA', s['geo_cap'] * u, opt['geo_w'], opt['geo_track'] * s['geo_track'])
        x = m.x0 + m.W + s['gap'] * u
        base1 = m.base - m.ry            # LOCAL HOST stands on the hills' ridge line
        base2 = base1 + (s['gap_line'] + s['geo_cap']) * u
        txt.append(('ink', T(lh, 1, x, base1)))
        # the round G is nudged left by its overshoot so it optically aligns with the L's stem
        txt.append(('accent', T(geo, 1, x - 0.025 * s['geo_cap'] * u, base2)))
    x0, y0, x1, y1 = m.box('all')
    for _, p in txt:
        b = p.bounds
        x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return m, txt, (x0, y0, x1, y1)


def render_svg(prefix, title, opt, kind, mode, pal, box=None, pad=0.0):
    m, txt, bb = layout(opt, kind, pal)
    if box is None:
        box = (bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad)
    bx, by, bw, bh = box
    defs, els = mark_svg(m, pal, mode, prefix, -bx, -by)
    bycol = {}
    for role, p in txt:
        col = pal['ink'] if mode == 'mono' else pal[role]
        bycol.setdefault(col, []).append(p)
    for col, ps in bycol.items():
        els.append(f'<path fill="{col}" d="{d_of(T(UNION(*ps), 1, -bx, -by))}"/>')
    d = f'<defs>{"".join(defs)}</defs>' if defs else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(bw)} {fmt(bh)}" role="img" '
            f'aria-labelledby="{prefix}-title"><title id="{prefix}-title">{title}</title>{d}{"".join(els)}</svg>\n')


VARIANTS = {
    # file name: (kind, mode, palette)
    'stacked': ('stacked', 'grad', 'normal'),
    'horizontal': ('horizontal', 'grad', 'normal'),
    'icon': ('icon', 'grad', 'normal'),
    'stacked-flat': ('stacked', 'flat', 'normal'),
    'horizontal-flat': ('horizontal', 'flat', 'normal'),
    'icon-flat': ('icon', 'flat', 'normal'),
    'mono': ('horizontal', 'mono', 'ink'),
    'mono-white': ('horizontal', 'mono', 'white'),
    'mono-stacked': ('stacked', 'mono', 'ink'),
    'icon-mono': ('icon', 'mono', 'ink'),
    'reverse': ('horizontal', 'grad', 'reverse'),
    'stacked-reverse': ('stacked', 'grad', 'reverse'),
    'icon-reverse': ('icon', 'grad', 'reverse'),
    'reverse-flat': ('horizontal', 'flat', 'reverse'),
}



def make(n, variant, prefix=None):
    opt = OPTIONS[n]
    kind, mode, palname = VARIANTS[variant]
    if palname == 'reverse':
        pal = reverse_palette(opt, n)
    elif palname == 'white':
        pal = dict(opt, ink=WHITE)
    else:
        pal = opt
    prefix = prefix or f'lh{n}-{variant}'
    title = 'Local Host' if kind == 'icon' else 'Local Host Georgia'
    return render_svg(prefix, title, opt, kind, mode, pal)


SITE_FILES = {   # website file -> option-2 variant
    'logo-horizontal.svg': 'horizontal',
    'logo-horizontal-reverse.svg': 'reverse',
    'logo-stacked.svg': 'stacked',
    'logo-stacked-reverse.svg': 'stacked-reverse',
    'logo-icon.svg': 'icon',
    'logo-icon-reverse.svg': 'icon-reverse',
    'logo-icon-mono.svg': 'icon-mono',
    'logo-mono.svg': 'mono',
    'logo-mono-white.svg': 'mono-white',
}


def favicon():
    """Option 2, flat colours, square canvas with a hair of padding for anti-aliasing.
    In dark browser chrome the hill greens switch to the lifted reverse tints (CSS media query)."""
    opt = OPTIONS[2]
    rev = reverse_palette(opt, 2)
    pad = 0.25 * UNIT
    box = (-pad, -pad, GRIDPX + 2 * pad, GRIDPX + 2 * pad)
    out = render_svg('lh-favicon', 'Local Host', opt, 'icon', 'flat', opt, box=box)
    # tag the three hill planes (document order: overlap underlay, left, right) for the media query
    for cls, key in (('o', 'overlap'), ('l', 'left'), ('r', 'right')):
        out = out.replace(f'<path fill="{opt[key][1]}"', f'<path class="{cls}" fill="{opt[key][1]}"', 1)
    style = ('<style>@media (prefers-color-scheme:dark){'
             f'.o{{fill:{rev["overlap"][1]}}}.l{{fill:{rev["left"][1]}}}.r{{fill:{rev["right"][1]}}}}}</style>')
    return out.replace('</title>', '</title>' + style, 1)


def main():
    for n, opt in OPTIONS.items():
        for v in VARIANTS:
            write(os.path.join(OUT, opt['slug'], v + '.svg'), make(n, v))
    for fname, v in SITE_FILES.items():
        write(os.path.join(SITE, fname), make(2, v, prefix=fname[:-4]))
    write(FAVICON, favicon())
    # palette dump for the page / README
    specs = {}
    for n, opt in OPTIONS.items():
        rev = reverse_palette(opt, n)
        specs[n] = {k: opt[k] for k in ('slug', 'name', 'note', 'sun', 'left', 'right', 'overlap', 'ink', 'accent',
                                         'word_w', 'geo_w', 'track', 'geo_track')}
        specs[n]['reverse'] = {k: rev[k] for k in ('left', 'right', 'overlap', 'ink', 'accent')}
    m = Mark(u=1)
    specs['geometry'] = dict(slope_deg=round(m.slope_deg(), 2), v_height=round(m.base - m.v_point()[1], 3),
                             sun_gap=round(m.sun_gap(), 3), tangent=[round(v, 3) for v in m.tangent()])
    write(os.path.join(HERE, 'specs.json'), json.dumps(specs, indent=1))
    print('built', sum(1 for _ in VARIANTS) * len(OPTIONS), 'option files,', len(SITE_FILES), 'site files + favicon')


if __name__ == '__main__':
    main()
