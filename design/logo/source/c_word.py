"""Concept 4 — Pin Wordmark: a refined serif 'Local Host' whose 'o' drops into a map pin."""
from build import *
from c_door import write_set

SLUG, NAME = 'pin-wordmark', 'Pin Wordmark'

FONT = dict(name='fraunces', wght=580, size=100, tracking=0.0)


def ellipse_tangent_pin(outer_b, tip_y):
    """wedge from ellipse (bounds) tangents to a tip below the centre."""
    x0, y0, x1, y1 = outer_b
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
    d = (tip_y - cy) / ry  # in unit-circle space
    th = math.acos(1 / d)
    tx, ty = math.sin(th), math.cos(th)
    pts = [(cx - tx * rx, cy + ty * ry), (cx, tip_y), (cx + tx * rx, cy + ty * ry), (cx, cy)]
    return poly(pts)


def pin_o(fontname, gid, size, wght, x, y, drop=0.36, counter='glyph'):
    gp = glyph_path(fontname, gid, size, wght)
    cs = sorted(list(gp.contours), key=lambda c: -(c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1]))
    outer, inner = cs[0], cs[1]
    ob = outer.bounds
    h = ob[3] - ob[1]
    tip_y = ob[3] + drop * h
    wedge = ellipse_tangent_pin(ob, tip_y)
    # rounded outer as a filled shape (reverse direction issues avoided by simplify)
    o_fill = Path(); o_fill.addPath(outer); o_fill.simplify()
    shape_ = U(o_fill, wedge)
    hole = Path(); hole.addPath(inner); hole.simplify()
    return T(shape_, 1, x, y), T(hole, 1, x, y)


def wordmark(mode, s='Local Host', which=1, f=FONT, drop=0.36):
    """Return (letters_path, pin_path, hole_path, width, glyphs)."""
    c = pal(mode)
    glyphs, w = shape(f['name'], s, f['size'], f['wght'], f['tracking'])
    letters = Path()
    pin_p = hole = None
    count = 0
    for i, g in enumerate(glyphs):
        if g['char'] == 'o':
            count += 1
            if count == which:
                pin_p, hole = pin_o(f['name'], g['gid'], f['size'], f['wght'], g['x'], g['y'], drop)
                continue
        gp = glyph_path(f['name'], g['gid'], f['size'], f['wght'])
        letters.addPath(T(gp, 1, g['x'], g['y']))
    letters.simplify()
    return letters, pin_p, hole, w


def word_layers(mode, s='Local Host', which=1, f=FONT, drop=0.36):
    c = pal(mode)
    letters, pin_p, hole, w = wordmark(mode, s, which, f, drop)
    out = [(c['text'], letters)]
    if pin_p is not None:
        out += [(c['red'], pin_p), (None, hole)]
    return out


def icon(mode='color', f=FONT):
    """'Lo' — the first two letters of the wordmark, the pin-o tucked into the L."""
    c = pal(mode)
    glyphs, w = shape(f['name'], 'Lo', f['size'], f['wght'], -0.02)
    L = glyph_path(f['name'], glyphs[0]['gid'], f['size'], f['wght'])
    pin_p, hole = pin_o(f['name'], glyphs[1]['gid'], f['size'], f['wght'], glyphs[1]['x'], 0, 0.36)
    return [(c['text'], L), (c['red'], pin_p), (None, hole)]


def tagline(mode, s, size=13.0):
    p, _ = text('manrope', s.upper(), size, wght=650, tracking=0.28)
    return p


def build(write_files=True):
    files = {}
    for mode, suf in (('color', ''), ('reverse', '-reverse'), ('mono', '-mono'), ('mono-white', '-mono-white')):
        c = pal(mode)
        wl = word_layers(mode)
        # horizontal: wordmark + tagline under it, aligned left
        wb = lbounds(wl)
        tg = tagline(mode, 'Inbound Tour Operator · South Caucasus', 12.0)
        tb = tg.bounds
        # tagline hangs from the baseline, right-aligned — the pin tip drops past it on the left
        lb = wl[0][1].bounds
        tg_p = T(tg, 1, lb[2] - tb[2] - 1, 0 + 16 - tb[1])
        files['horizontal' + suf] = wl + [(c['tag'], tg_p)]
        # stacked: Local / Host on two lines, tagline below
        l1 = word_layers(mode, 'Local', 1)
        l2 = word_layers(mode, 'Host', 0)
        b1, b2 = lbounds(l1), lbounds(l2)
        l2p = place(l2, 1, (b1[0] + b1[2]) / 2 - (b2[0] + b2[2]) / 2, 104)
        st = l1 + l2p
        sb = lbounds(st)
        tg2 = tagline(mode, 'Georgia · Armenia · Azerbaijan', 11.0)
        t2 = tg2.bounds
        tg2p = T(tg2, 1, (sb[0] + sb[2]) / 2 - (t2[0] + t2[2]) / 2, sb[3] + 18 - t2[1])
        files['stacked' + suf] = st + [(c['tag'], tg2p)]
        files['wordmark' + suf] = wl
        if mode == 'color':
            files['icon'] = icon(mode)
        if mode == 'reverse':
            files['icon-reverse'] = icon(mode)
    if write_files:
        write_set(SLUG, NAME, files)
        emit(SLUG, NAME, 'wordmark', files['wordmark'], 4)
        emit(SLUG, NAME, 'wordmark-reverse', files['wordmark-reverse'], 4)
    return files
