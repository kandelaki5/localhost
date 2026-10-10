"""Concept 1 — Open Door: the pin's counter is an arched doorway; inside it, the Caucasus."""
from build import *

SLUG, NAME = 'open-door', 'Open Door'


def door_shape(cx, top, half, sill):
    r = half
    acy = top + r
    return P(f'M{cx-half} {sill}V{acy}A{r} {r} 0 0 1 {cx+half} {acy}V{sill}Z')


def peak(apex, left_base, right_base, r=1.4):
    """Mountain triangle with a softly rounded apex."""
    ax, ay = apex
    tri = poly([left_base, apex, right_base])
    if r <= 0:
        return tri
    # round apex: intersect with a big shape whose top is a circle tangent to both flanks
    (lx, ly), (rx, ry) = left_base, right_base
    v1 = (lx - ax, ly - ay); v2 = (rx - ax, ry - ay)
    n1 = math.hypot(*v1); n2 = math.hypot(*v2)
    u1 = (v1[0] / n1, v1[1] / n1); u2 = (v2[0] / n2, v2[1] / n2)
    half = math.acos(u1[0] * u2[0] + u1[1] * u2[1]) / 2
    bis = ((u1[0] + u2[0]), (u1[1] + u2[1])); bn = math.hypot(*bis); bis = (bis[0] / bn, bis[1] / bn)
    dc = r / math.sin(half)
    cc = (ax + bis[0] * dc, ay + bis[1] * dc)
    t = r / math.tan(half)
    t1 = (ax + u1[0] * t, ay + u1[1] * t)
    t2 = (ax + u2[0] * t, ay + u2[1] * t)
    body = poly([left_base, t1, cc, t2, right_base])
    return U(body, circle(cc[0], cc[1], r), I(tri, circle(cc[0], cc[1], r)))


GEOM = dict(cx=50, cy=38, R=34, tip=95, door_half=16, door_top=13.5, sill=61)


def icon(mode='color', g=GEOM, variant='flush'):
    c = pal(mode)
    cx, cy, R = g['cx'], g['cy'], g['R']
    body = pin(cx, cy, R, g['tip'], tip_round=1.6)
    door = door_shape(cx, g['door_top'], g['door_half'], g['sill'])
    sill = g['sill']
    # mountains seen through the doorway (big back peak + nearer front peak)
    back = peak((44.6, 31.5), (16, sill + 20), (73, sill + 20), r=1.5)
    front = peak((58.2, 42.0), (41, sill + 14), (80, sill + 14), r=1.5)
    if variant == 'float':
        inner = D(door, outline(door, 4.4))
    else:
        inner = door
    back_v = I(back, inner)
    front_v = I(front, inner)
    layers = [(c['red'], body), (None, door), (c['dg'], back_v), (c['lg'], front_v)]
    if mode.startswith('mono'):
        # keep the two ridges legible in one colour: a hairline of sky between them
        layers = [(c['red'], body), (None, door), (c['dg'], back_v), (c['lg'], front_v)]
    return layers


def words(mode, tagline='Inbound Tour Operator · South Caucasus'):
    c = pal(mode)
    wm, _ = text('jakarta', 'LOCAL HOST', 40, wght=800, tracking=0.085, adj=OPTICAL_KERN)
    b = wm.bounds
    tg = text_fit('jakarta', tagline.upper(), b[2] - b[0], wght=600, tracking=0.16 if len(tagline) > 32 else 0.3)
    return wm, tg


def build(write_files=True):
    files = {}
    for mode, suf in (('color', ''), ('reverse', '-reverse'), ('mono', '-mono'), ('mono-white', '-mono-white')):
        c = pal(mode)
        ic = place(icon(mode), 1, 0, 0)
        wm, tg = words(mode)
        h = lockup_h(ic, [(c['text'], wm, 0), (c['tag'], tg, 11)], gap=20, center=38 + 3)
        wm2, tg2 = words(mode, 'Georgia · Armenia · Azerbaijan')
        s = lockup_s(place(ic, 1.45, 0, 0), [(c['text'], T(wm2, 1.0), 0), (c['tag'], T(tg2, 1.0), 11)], gap=20)
        files['horizontal' + suf] = h
        files['stacked' + suf] = s
        if mode == 'color':
            files['icon'] = ic
        if mode == 'reverse':
            files['icon-reverse'] = ic
    out = {}
    for k, layers in files.items():
        kind = k.replace('-mono-white', '-mono-white').replace('horizontal-mono', 'mono') if False else k
        out[k] = layers
    if write_files:
        write_set(SLUG, NAME, out)
    return out


def write_set(slug, name, sets):
    names = {
        'horizontal': 'horizontal', 'stacked': 'stacked', 'icon': 'icon',
        'horizontal-reverse': 'horizontal-reverse', 'stacked-reverse': 'stacked-reverse',
        'icon-reverse': 'icon-reverse',
        'horizontal-mono': 'mono', 'stacked-mono': 'mono-stacked',
        'horizontal-mono-white': 'mono-white', 'stacked-mono-white': 'mono-stacked-white',
    }
    for k, layers in sets.items():
        if k not in names:
            continue
        pad = 2 if k.startswith('icon') else 4
        emit(slug, name, names[k], layers, pad)
