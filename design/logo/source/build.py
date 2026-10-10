"""Builds every logo SVG for design/logo/.  Run: python3 build.py"""
import math, os, sys
from lib import *

OUT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

RED = '#D02027'
DG = '#13783C'
LG = '#2BB34B'
CREAM = '#F7F3EA'
FOREST = '#0D3A24'   # deep forest — dark backgrounds
INK = '#0B1F14'      # one-colour master (near-black green)
WHITE = '#FFFFFF'

# reverse (on deep forest) palette
R_RED = '#E8443A'
R_DG = '#2BB34B'
R_LG = '#7FD08F'


def pal(mode):
    if mode == 'color':
        return dict(red=RED, dg=DG, lg=LG, text=DG, sub=RED, tag=DG, paper=CREAM, ink=DG)
    if mode == 'reverse':
        return dict(red=RED, dg=R_DG, lg=R_LG, text=CREAM, sub=R_LG, tag=R_LG, paper=FOREST, ink=CREAM)
    if mode == 'mono':
        return dict(red=INK, dg=INK, lg=INK, text=INK, sub=INK, tag=INK, paper=None, ink=INK)
    if mode == 'mono-white':
        return dict(red=WHITE, dg=WHITE, lg=WHITE, text=WHITE, sub=WHITE, tag=WHITE, paper=None, ink=WHITE)
    raise ValueError(mode)


def place(layers, s, tx, ty):
    return [(c, T(p, s, tx, ty)) for c, p in layers]


def lbounds(layers):
    return U(*[p for c, p in layers if c is not None]).bounds


def emit(slug, name, kind, layers, pad):
    path = f'{OUT}/{slug}/{kind}.svg'
    write(path, svg(layers, f'Local Host — {name} ({kind})', pad=pad))
    return path


# =====================================================================
# 0. CURRENT REDRAW
# =====================================================================

def redraw_icon(mode):
    c = pal(mode)
    # geometry measured from docs/reference/old-logo.png (mark-local px, x4 later)
    pin_c = (34, 23); pin_r = 23; tip = 56.6; hole = 8.6
    base_c = (34, 23); base_r = 60.5
    # dark hill (left)
    A = (0, base_c[1] + math.sqrt(base_r ** 2 - 34 ** 2))
    Bx = 42.2
    B = (Bx, base_c[1] + math.sqrt(base_r ** 2 - (Bx - 34) ** 2))
    d = (f'M{A[0]} {A[1]:.3f} C4 65 11 57 17 53.05 C18.1 52.3 20.3 52.35 21.3 53.3 '
         f'C30.3 62.3 41 73 {B[0]} {B[1]:.3f} A{base_r} {base_r} 0 0 1 {A[0]} {A[1]:.3f}Z')
    # both hills are cut by the very same bowl so their shared bottom edge is identical
    bowl = circle(base_c[0], base_c[1], base_r)
    d = (f'M{A[0] - 6} {A[1] + 4:.3f} L{A[0]} {A[1]:.3f} C4 65 11 57 17 53.05 C18.1 52.3 20.3 52.35 21.3 53.3 '
         f'C30.3 62.3 41 73 {B[0]} {B[1]:.3f} L{B[0] + 1.5} {B[1] + 12:.3f} L{A[0] - 6} {A[1] + 12:.3f}Z')
    raw = P(d)
    dark = I(raw, bowl)
    light = I(mirror_x(raw, 34), bowl)
    pinp = pin(pin_c[0], pin_c[1], pin_r, tip, tip_round=0.6)
    layers = [(c['dg'], dark), (c['lg'], light)]
    if mode.startswith('mono'):
        # one colour: separate the overlapping hills with a hairline gap
        layers = [(c['dg'], D(dark, outline(light, 3.2))), (c['lg'], light)]
    layers += [(c['red'], pinp), (None, circle(pin_c[0], pin_c[1], hole))]
    return [(col, T(p, 4)) for col, p in layers]


def redraw_words(mode, size=1.0):
    c = pal(mode)
    wm, w1 = text('outfit', 'LOCAL HOST', 62 * size, wght=900, tracking=0.192)
    ka, w2 = text('notosansgeo', 'ᲡᲐᲥᲐᲠᲗᲕᲔᲚᲝ', 31 * size, wght=700, tracking=0.0)
    return (c['text'], wm, w1), (c['sub'], ka, w2)


def build_redraw():
    slug, name = 'current-redraw', 'Current mark, redrawn'
    for mode, suf in (('color', ''), ('reverse', '-reverse')):
        icon = redraw_icon(mode)
        (tc, wm, w1), (sc, ka, w2) = redraw_words(mode)
        # stacked — as the original: wordmark width ~1.82x mark width
        x0, y0, x1, y1 = lbounds(icon)
        mw = x1 - x0
        cx = (x0 + x1) / 2
        wb = wm.bounds
        cap = wb[3] - wb[1]
        wm_s = T(wm, 1, cx - (wb[0] + wb[2]) / 2, y1 + 31 - wb[1])
        kb = ka.bounds
        ka_s = T(ka, 1, cx - (kb[0] + kb[2]) / 2, wm_s.bounds[3] + 30 - kb[1])
        emit(slug, name, 'stacked' + suf, icon + [(tc, wm_s), (sc, ka_s)], 8)
        # horizontal
        wb = wm.bounds
        h = y1 - y0
        tx = x1 + 46
        blockh = (wb[3] - wb[1]) + 26 + (kb[3] - kb[1])
        ty = y0 + h * 0.56 - blockh / 2
        wm_h = T(wm, 1, tx - wb[0], ty - wb[1])
        ka_h = T(ka, 1, tx - kb[0] + 2, wm_h.bounds[3] + 26 - kb[1])
        emit(slug, name, 'horizontal' + suf, icon + [(tc, wm_h), (sc, ka_h)], 8)
        if mode == 'color':
            emit(slug, name, 'icon', icon, 6)
    # one-colour (stacked master)
    for mode, kind in (('mono', 'mono'), ('mono-white', 'mono-white')):
        icon = redraw_icon(mode)
        (tc, wm, w1), (sc, ka, w2) = redraw_words(mode)
        x0, y0, x1, y1 = lbounds(icon)
        cx = (x0 + x1) / 2
        wb = wm.bounds
        wm_s = T(wm, 1, cx - (wb[0] + wb[2]) / 2, y1 + 31 - wb[1])
        kb = ka.bounds
        ka_s = T(ka, 1, cx - (kb[0] + kb[2]) / 2, wm_s.bounds[3] + 30 - kb[1])
        emit(slug, name, kind, icon + [(tc, wm_s), (sc, ka_s)], 8)



# =====================================================================
# lockup helpers
# =====================================================================

def stack_lines(lines, align='left'):
    """lines: list of (colour, path, gap_before). Returns layers with first line's cap top at y=0,
    aligned left at x=0 or centred on x=0."""
    out = []
    y = 0
    for i, (col, p, gap) in enumerate(lines):
        b = p.bounds
        if i > 0:
            y += gap
        if align == 'left':
            q = T(p, 1, -b[0], y - b[1])
        else:
            q = T(p, 1, -(b[0] + b[2]) / 2, y - b[1])
        out.append((col, q))
        y = q.bounds[3]
    return out


def lockup_h(icon, lines, gap, center=None, dy=0):
    """icon already scaled. Text block placed right of icon, centred on icon's vertical centre
    (or on `center` y)."""
    x0, y0, x1, y1 = lbounds(icon)
    block = stack_lines(lines, 'left')
    bx0, by0, bx1, by1 = lbounds(block)
    cy = (y0 + y1) / 2 if center is None else center
    return icon + place(block, 1, x1 + gap, cy - (by1 - by0) / 2 + dy)


def lockup_s(icon, lines, gap):
    x0, y0, x1, y1 = lbounds(icon)
    block = stack_lines(lines, 'center')
    return icon + place(block, 1, (x0 + x1) / 2, y1 + gap)


def mono_of(layers, ink):
    return [(None if c is None else ink, p) for c, p in layers]
