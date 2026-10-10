"""Concept 3 — Caucasus Stamp: a perforated postage roundel (heritage of the old stamp tiles)
with a postmark ring and the pin standing above three ranges."""
from build import *
from c_door import write_set

SLUG, NAME = 'caucasus-stamp', 'Caucasus Stamp'


def perforated_disc(cx, cy, R, n, br):
    disc = circle(cx, cy, R)
    bites = U(*[circle(cx + R * math.cos(2 * math.pi * i / n), cy + R * math.sin(2 * math.pi * i / n), br)
                for i in range(n)])
    return D(disc, bites)


def medallion_art(c, cx, cy, r, paper, inset=5.5):
    """mountains + pin inside a disc of radius r (returns layers, clipped to r - inset)."""
    k = r / 58.0
    def X(x): return cx + (x - 100) * k
    def Y(y): return cy + (y - 100) * k
    clipc = circle(cx, cy, r - inset * k)
    back = poly([(X(30), Y(175)), (X(30), Y(124)), (X(60), Y(106)), (X(77), Y(118)), (X(100), Y(90)),
                 (X(123), Y(118)), (X(140), Y(106)), (X(170), Y(124)), (X(170), Y(175))])
    front = P(f'M{X(30)} {Y(175)}V{Y(150)}C{X(62)} {Y(146)} {X(92)} {Y(126)} {X(122)} {Y(126)}'
              f'C{X(142)} {Y(126)} {X(158)} {Y(132)} {X(170)} {Y(140)}V{Y(175)}Z')
    pr = 12.5 * k
    tipy = Y(82)
    pc = Y(57)
    pn = pin(cx, pc, pr, tipy, tip_round=0.6 * k)
    return [(c['dg'], I(back, clipc)), (c['lg'], I(front, clipc)), (c['red'], pn),
            (None if paper is None else paper, circle(cx, pc, pr * 0.42))]


def icon(mode='color', ring=True):
    c = pal(mode)
    mono = mode.startswith('mono')
    paper = None if mono else CREAM
    body_col = c['dg']
    cx = cy = 100
    R = 100
    body = perforated_disc(cx, cy, R, 60 if ring else 40, 3.0 if ring else 4.0)
    layers = [(body_col, body)]
    if ring:
        line = D(circle(cx, cy, 90.5), circle(cx, cy, 88.6))
        top = text_on_circle('outfit', 'LOCAL HOST', 17.5, cx, cy, 66.5, -90, wght=700, tracking=0.2, r_measure=74)
        bot = text_on_circle('outfit', 'SOUTH CAUCASUS', 13.2, cx, cy, 81.5, 90, wght=700, tracking=0.18, bottom=True, r_measure=74)
        dots = U(circle(cx - 74.5, cy, 2.6), circle(cx + 74.5, cy, 2.6))
        ink = paper  # cream on green (colour) / knocked out (mono)
        layers += [(ink, line), (ink, top), (ink, bot), (ink, dots)]
        mr = 59.0
        layers += [(paper, circle(cx, cy, mr))]
        art = medallion_art(c, cx, cy, mr - 0.01, paper)
    else:
        mr = 78.0
        layers += [(paper, circle(cx, cy, mr))]
        art = medallion_art(c, cx, cy + 0, mr - 0.01, paper)
    if mono:
        # in one colour, the medallion is paper: the ring needs an inner keyline
        layers = [(body_col, D(body, circle(cx, cy, mr)))] + [l for l in layers[1:] if l[1] is not None]
        layers = [(body_col, D(body, circle(cx, cy, mr)))] + [(None, l[1]) for l in layers[1:-1]]
        art = [(INK if mode == 'mono' else WHITE, p) if col is not None else (None, p) for col, p in art]
        # front hills separated from back range by a hairline of paper
        back, front = art[0][1], art[1][1]
        art[0] = (art[0][0], D(back, outline(front, 4.0)))
    return layers + art


def words(mode, tagline):
    wm, _ = text('outfit', 'LOCAL HOST', 38, wght=700, tracking=0.12, adj=OPTICAL_KERN)
    b = wm.bounds
    tg = text_fit('outfit', tagline.upper(), b[2] - b[0], wght=500, tracking=0.2 if len(tagline) > 32 else 0.3)
    return wm, tg


def build(write_files=True):
    files = {}
    for mode, suf in (('color', ''), ('reverse', '-reverse'), ('mono', '-mono'), ('mono-white', '-mono-white')):
        c = pal(mode)
        ic = icon(mode, ring=True)
        wm, tg = words(mode, 'Georgia · Armenia · Azerbaijan')
        h = lockup_h(place(icon(mode, ring=False), 0.62, 0, 0), [(c['text'], wm, 0), (c['tag'], tg, 13)], gap=24)
        wm2, tg2 = words(mode, 'Georgia · Armenia · Azerbaijan')
        s = lockup_s(place(ic, 0.95, 0, 0), [(c['text'], wm2, 0), (c['tag'], tg2, 13)], gap=24)
        files['horizontal' + suf] = h
        files['stacked' + suf] = s
        if mode == 'color':
            files['icon'] = icon(mode, ring=False)
            files['badge'] = ic
        if mode == 'reverse':
            files['icon-reverse'] = icon(mode, ring=False)
    if write_files:
        write_set(SLUG, NAME, files)
        emit(SLUG, NAME, 'badge', files['badge'], 2)
    return files
