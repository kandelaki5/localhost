"""Concept 2 — Summit Monogram: an L+H ligature whose crossbar is a three-peak ridge
(Georgia · Armenia · Azerbaijan) with the pin standing on the highest summit."""
from build import *
from c_door import write_set

SLUG, NAME = 'summit-monogram', 'Summit Monogram'

G = dict(w=17.0, top=4.0, bot=96.0, xl=6.0, xr=94.0, roof=8.0, rr=2.2,
         ridge_w=11.5, foot_x=56.0, foot_h=15.0,
         main=40.0, side=47.5, valley=53.5, sx=15.0, vx=7.5, pin_r=11.0, pin_gap=4.0)


def icon(mode='color', g=G, roof=False, foot=True, pin_on=True):
    c = pal(mode)
    w, top, bot, xl, xr = g['w'], g['top'], g['bot'], g['xl'], g['xr']
    rr = g['rr']
    # stems; tops slope down outward like the eaves of a roof / flanks of a mountain
    rf = g['roof'] if roof else 0
    left = P(f'M{xl} {bot}V{top+rf}L{xl+w} {top}V{bot}Z')
    right = P(f'M{xr-w} {bot}V{top}L{xr} {top+rf}V{bot}Z')
    # L foot
    foot_p = rect(xl, bot - g['foot_h'], g['foot_x'] - xl, g['foot_h']) if foot else None
    # crossbar = a mountain massif: flat underside, three summits on top (main one highest)
    yb = g.get('yb', 61.0); bh = g.get('bar_h', 11.0)
    side, valley, main = g.get('side', 49.0), g.get('valley', 55.0), g.get('main', 39.0)
    sx, vx = g.get('sx', 14.0), g.get('vx', 7.0)
    x1, x2 = xl + w - 1, xr - w + 1
    ridge = poly([(x1, yb + bh), (x1, yb), (50 - sx, side), (50 - vx, valley), (50, main),
                  (50 + vx, valley), (50 + sx, side), (x2, yb), (x2, yb + bh)])
    letters = U(left, right, foot_p, ridge)
    layers = [(c['dg'], letters)]
    if pin_on:
        # pin standing on the main summit (tip hovers just above the apex)
        apex_y = main
        gap = g.get('pin_gap', 3.0)
        tip = apex_y - gap
        pr = g.get('pin_r', 10.5)
        pc = g.get('pin_top', 3.2) + pr
        layers += [(c['red'], pin(50, pc, pr, tip, tip_round=0.6)),
                   (None, circle(50, pc, pr * 0.4))]
    return layers


def words(mode, tagline):
    wm, _ = text('unbounded', 'LOCAL HOST', 34, wght=600, tracking=0.04, adj={('L', 'O'): -0.04, ('A', 'L'): -0.01})
    b = wm.bounds
    tg = text_fit('manrope', tagline.upper(), b[2] - b[0], wght=700, tracking=0.2 if len(tagline) > 32 else 0.36)
    return wm, tg


def build(write_files=True):
    files = {}
    for mode, suf in (('color', ''), ('reverse', '-reverse'), ('mono', '-mono'), ('mono-white', '-mono-white')):
        c = pal(mode)
        ic = icon(mode)
        wm, tg = words(mode, 'Inbound Tour Operator · South Caucasus')
        h = lockup_h(place(ic, 0.9, 0, 0), [(c['text'], wm, 0), (c['tag'], tg, 12)], gap=22)
        wm2, tg2 = words(mode, 'Georgia · Armenia · Azerbaijan')
        s = lockup_s(place(ic, 1.3, 0, 0), [(c['text'], wm2, 0), (c['tag'], tg2, 12)], gap=22)
        files['horizontal' + suf] = h
        files['stacked' + suf] = s
        if mode == 'color':
            files['icon'] = ic
        if mode == 'reverse':
            files['icon-reverse'] = ic
    if write_files:
        write_set(SLUG, NAME, files)
    return files
