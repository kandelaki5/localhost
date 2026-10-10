"""Generate the presentation page design/logo/chosen/index.html from the built SVGs.

    python3 design/logo/chosen/source/build.py && python3 design/logo/chosen/source/page.py

Each SVG is inlined once (that exercises the per-file gradient ids); repeats use <img>.
"""
import os
import sys
import json
import html

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import colour as C
from mark import Mark
from build import OPTIONS, UNIT, write, fmt, STACK, HORIZ, CREAM, FOREST

OUT = os.path.abspath(os.path.join(HERE, '..'))
REF = '../../../docs/reference/chosen-logo-options.jpg'
NM = '../../../node_modules'


def svg(n, variant):
    with open(os.path.join(OUT, f'option-{n}', variant + '.svg')) as fh:
        s = fh.read().strip()
    return s


def img(n, variant, h=None, w=None, alt='Local Host', cls=''):
    a = f' height="{h}"' if h else ''
    a += f' width="{w}"' if w else ''
    c = f' class="{cls}"' if cls else ''
    return f'<img src="option-{n}/{variant}.svg"{a}{c} alt="{alt}">'


# --------------------------------------------------------------------------- construction drawing
def construction():
    u = 20.0
    m = Mark(u=u)
    pad = 2.2 * u
    W = m.W + 2 * pad
    H = m.H + 2 * pad
    g = []
    # grid
    for i in range(13):
        x = pad + i * u
        g.append(f'<line x1="{fmt(x)}" y1="{fmt(pad)}" x2="{fmt(x)}" y2="{fmt(pad + m.H)}" class="grid"/>')
        y = pad + i * u
        g.append(f'<line x1="{fmt(pad)}" y1="{fmt(y)}" x2="{fmt(pad + m.W)}" y2="{fmt(y)}" class="grid"/>')
    dx = dy = pad
    # flat shapes, light
    g.append(f'<path d="{m.d_hills(dx, dy)}" class="fill-o"/>')
    g.append(f'<path d="{m.d_left_only(dx, dy)}" class="fill-l"/>')
    g.append(f'<path d="{m.d_right_only(dx, dy)}" class="fill-r"/>')
    cx, cy, r = m.sun(dx, dy)
    g.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}" class="fill-s"/>')
    # construction ellipses (upper halves) and their centres on the base line
    for sgn in (-1, 1):
        ex = m.cx + sgn * m.peak + dx
        by = m.base + dy
        g.append(f'<path d="M{fmt(ex - m.rx)} {fmt(by)}A{fmt(m.rx)} {fmt(m.ry)} 0 0 1 {fmt(ex + m.rx)} {fmt(by)}" class="con"/>')
        g.append(f'<circle cx="{fmt(ex)}" cy="{fmt(by)}" r="2.2" class="dot"/>')
    # 45 deg slope lines: from just below each foot, past the tangent point on the opposite dome
    vx, vy = m.v_point()
    tx, ty = m.tangent()
    for sgn in (1, -1):
        fx = m.cx + sgn * m.foot                   # foot of the slope
        px = tx if sgn > 0 else m.mx(tx)           # its tangent point on the dome
        e = 0.6 * u
        x1, y1 = fx + sgn * e, m.base + e
        x2, y2 = px - sgn * 1.4 * u, ty - 1.4 * u
        g.append(f'<line x1="{fmt(x1 + dx)}" y1="{fmt(y1 + dy)}" x2="{fmt(x2 + dx)}" y2="{fmt(y2 + dy)}" class="con red"/>')
        g.append(f'<circle cx="{fmt(px + dx)}" cy="{fmt(ty + dy)}" r="2.6" class="dot red"/>')
    g.append(f'<circle cx="{fmt(vx + dx)}" cy="{fmt(vy + dy)}" r="2.6" class="dot red"/>')
    # sun construction: circle centre + horizon (sun bottom) and ridge line
    g.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="2.2" class="dot"/>')
    g.append(f'<line x1="{fmt(dx - 0.6 * u)}" y1="{fmt(m.base - m.ry + dy)}" x2="{fmt(dx + m.W + 0.6 * u)}" y2="{fmt(m.base - m.ry + dy)}" class="con dash"/>')
    g.append(f'<line x1="{fmt(m.cx + dx)}" y1="{fmt(dy - 0.6 * u)}" x2="{fmt(m.cx + dx)}" y2="{fmt(m.base + dy + 0.6 * u)}" class="con dash"/>')
    # labels
    lab = []

    def t(x, y, s, anchor='start', cls='lab'):
        lab.append(f'<text x="{fmt(x)}" y="{fmt(y)}" text-anchor="{anchor}" class="{cls}">{s}</text>')
    t(dx + m.W + 0.35 * u, cy + dy * 0 + 4, 'r = 3U', 'start')
    t(dx + m.W + 0.35 * u, m.base - m.ry + dy + 4, 'ridge 5.8U', 'start')
    t(vx + dx, vy + dy + 1.45 * u, '90°', 'middle', 'lab red')
    t(dx + 1.0 * u, m.base + dy + 1.25 * u, '45° slopes, tangent to the domes', 'start', 'lab red')
    t(dx - 0.35 * u, dy + 4, '12U', 'end')
    t(dx - 0.35 * u, m.base + dy, '0', 'end')
    style = ('<style>.grid{stroke:#0D2524;stroke-opacity:.09;stroke-width:1}.con{fill:none;stroke:#0D2524;stroke-opacity:.55;stroke-width:1}'
             '.con.red{stroke:#C72F25;stroke-opacity:.9}.dash{stroke-dasharray:4 4}.dot{fill:#0D2524}.dot.red{fill:#C72F25}'
             '.fill-o{fill:#138450;opacity:.22}.fill-l{fill:#0E643D;opacity:.22}.fill-r{fill:#189659;opacity:.22}.fill-s{fill:#DC341F;opacity:.2}'
             '.lab{font:500 12px Outfit,sans-serif;fill:#0D2524}.lab.red{fill:#B3171E}</style>')
    return (f'<svg class="construction" viewBox="0 0 {fmt(W + 3.2 * u)} {fmt(H)}" role="img" aria-label="Construction of the mark on a 12-unit grid">'
            f'{style}{"".join(g)}{"".join(lab)}</svg>')


# --------------------------------------------------------------------------- page pieces
ORIG_CROPS = {1: (20, 170, 470, 650), 2: (500, 170, 1010, 650), 3: (1035, 170, 1525, 650)}


def orig_crop(n, width=300):
    x0, y0, x1, y1 = ORIG_CROPS[n]
    s = width / (x1 - x0)
    return (f'<div class="crop" style="width:{fmt(width)}px;height:{fmt((y1 - y0) * s)}px">'
            f'<img src="{REF}" alt="Original option {n}" style="width:{fmt(1536 * s)}px;left:-{fmt(x0 * s)}px;top:-{fmt(y0 * s)}px"></div>')


def chip(hexv, label, sub=''):
    dark = C.luminance(hexv) < 0.3
    return (f'<div class="chip"><span class="sw" style="background:{hexv}"></span><span class="cl"><b>{label}</b>'
            f'<code>{hexv}</code><code>{C.rgb_str(hexv)}</code>{f"<i>{sub}</i>" if sub else ""}</span></div>')


def grad_chip(stops, label):
    a, b, c = stops
    return (f'<div class="chip"><span class="sw" style="background:linear-gradient(135deg,{a},{b} 50%,{c})"></span>'
            f'<span class="cl"><b>{label}</b><code>{a} → {b} → {c}</code><i>flat: {b} · {C.rgb_str(b)}</i></span></div>')


def option_section(n):
    o = OPTIONS[n]
    from build import reverse_palette
    rev = reverse_palette(o, n)
    used = n == 2
    badge = '<span class="badge">Used on the website</span>' if used else ''
    chips = ''.join([
        grad_chip(o['sun'], 'Sun'), grad_chip(o['left'], 'Left hill'), grad_chip(o['right'], 'Right hill'),
        grad_chip(o['overlap'], 'Overlap'), chip(o['ink'], 'Wordmark ink'), chip(o['accent'], 'GEORGIA'),
    ])
    rchips = ''.join([
        chip(rev['left'][1], 'Left hill (rev.)'), chip(rev['right'][1], 'Right hill (rev.)'),
        chip(rev['overlap'][1], 'Overlap (rev.)'), chip(rev['accent'], 'GEORGIA (rev.)'),
    ])
    type_line = (f'Outfit {o["word_w"]} · tracking {o["track"] * 1000:+.0f}/1000 em &nbsp;|&nbsp; '
                 f'GEORGIA Outfit {o["geo_w"]} · tracking {o["geo_track"] * 1000:+.0f}/1000 em')
    return f'''
<section class="option" id="option-{n}">
  <header class="ohead">
    <p class="eyebrow">Option {n}</p>
    <h2>{o["name"]} {badge}</h2>
    <p class="lede">{o["note"]}</p>
  </header>
  <div class="row">
    <figure class="panel white orig-panel">{orig_crop(n, 250)}<figcaption>Original (raster mock-up)</figcaption></figure>
    <figure class="panel cream"><div class="art stk">{svg(n, "stacked")}</div><figcaption>Stacked · gradient</figcaption></figure>
    <figure class="panel cream"><div class="art stk">{svg(n, "stacked-flat")}</div><figcaption>Stacked · flat</figcaption></figure>
    <figure class="panel dark"><div class="art stk">{svg(n, "stacked-reverse")}</div><figcaption>Stacked · reverse</figcaption></figure>
  </div>
  <div class="row two">
    <figure class="panel cream"><div class="art hz">{svg(n, "horizontal")}</div><figcaption>Horizontal · gradient</figcaption></figure>
    <figure class="panel cream"><div class="art hz">{svg(n, "horizontal-flat")}</div><figcaption>Horizontal · flat</figcaption></figure>
    <figure class="panel dark"><div class="art hz">{svg(n, "reverse")}</div><figcaption>Horizontal · reverse (gradient)</figcaption></figure>
    <figure class="panel dark"><div class="art hz">{svg(n, "reverse-flat")}</div><figcaption>Horizontal · reverse (flat)</figcaption></figure>
  </div>
  <div class="row icons">
    <figure class="panel cream sq"><div class="art ic">{svg(n, "icon")}</div><figcaption>Icon · gradient</figcaption></figure>
    <figure class="panel cream sq"><div class="art ic">{svg(n, "icon-flat")}</div><figcaption>Icon · flat</figcaption></figure>
    <figure class="panel dark sq"><div class="art ic">{svg(n, "icon-reverse")}</div><figcaption>Icon · reverse</figcaption></figure>
    <figure class="panel white sq"><div class="art ic">{svg(n, "icon-mono")}</div><figcaption>Icon · one colour</figcaption></figure>
    <figure class="panel white wide"><div class="art hz">{svg(n, "mono")}</div><figcaption>One colour · ink</figcaption></figure>
    <figure class="panel dark wide"><div class="art hz">{svg(n, "mono-white")}</div><figcaption>One colour · white</figcaption></figure>
  </div>
  <div class="specs">
    <div class="chips">{chips}</div>
    <div class="chips rev"><span class="chips-h">On Forest {FOREST}:</span>{rchips}</div>
    <p class="type">{type_line}</p>
  </div>
</section>'''


def small_sizes():
    rows = ['<div class="shead"><span></span><span>Icon on cream</span><span>Icon on Forest</span><span>Horizontal lockup (24 · 32 · 40 px high)</span></div>']
    for n in (1, 2, 3):
        cells = ''.join(f'<div class="sz">{img(n, "icon-flat" if px <= 24 else "icon", w=px)}<span>{px}</span></div>' for px in (16, 24, 32, 48, 64))
        dcells = ''.join(f'<div class="sz">{img(n, "icon-reverse", w=px)}<span>{px}</span></div>' for px in (16, 24, 32, 48, 64))
        hz = ''.join(f'<div class="sz">{img(n, "horizontal", h=px)}<span>{px}</span></div>' for px in (24, 32, 40))
        rows.append(f'<div class="srow"><p class="sname">Option {n}</p><div class="sgroup cream">{cells}</div>'
                    f'<div class="sgroup dark">{dcells}</div><div class="sgroup cream hzg">{hz}</div></div>')
    fav = ''.join(f'<div class="sz"><img src="../../../public/favicon.svg" width="{px}" alt="favicon"><span>{px}</span></div>' for px in (16, 32))
    return f'''
<section class="small" id="small-sizes">
  <header class="ohead"><p class="eyebrow">Small sizes</p><h2>16 · 24 · 32 · 48 · 64 px</h2>
  <p class="lede">Icons at real pixel size (16 and 24 px use the flat file, as the favicon does). Horizontal lockups at 24, 32 and 48 px height.</p></header>
  {''.join(rows)}
  <div class="srow fav"><p class="sname">Favicon</p><div class="sgroup cream">{fav}</div>
    <div class="tab"><img src="../../../public/favicon.svg" width="16" alt=""><span>Local Host — Tours in Georgia</span></div>
    <div class="tab dark"><img src="../../../public/favicon.svg" width="16" alt=""><span>Local Host — Tours in Georgia</span></div></div>
</section>'''


def mockups():
    return f'''
<section class="mockups" id="mockups">
  <header class="ohead"><p class="eyebrow">In use (Option 2)</p><h2>Website header, business card, social avatar</h2></header>
  <div class="site">
    <div class="nav">{img(2, "horizontal", h=46, cls="navlogo")}
      <nav><a>Tours</a><a>Experiences</a><a>South Caucasus</a><a>About</a><a>Contact</a></nav>
      <a class="cta">Plan a trip</a></div>
    <div class="hero"><p class="kicker">Tbilisi · since 2015</p><h3>Three countries. One local host.</h3>
      <p>Small-group and tailor-made tours across Georgia, Armenia and Azerbaijan.</p></div>
    <div class="nav dark">{img(2, "reverse", h=40, cls="navlogo")}
      <nav><a>Tours</a><a>Experiences</a><a>South Caucasus</a><a>About</a><a>Contact</a></nav>
      <a class="cta light">Plan a trip</a></div>
  </div>
  <div class="cards">
    <div class="card front">{img(2, "stacked", h=146)}</div>
    <div class="card back">
      <div class="cb-top">{img(2, "reverse", h=50)}</div>
      <div class="cb-info"><p>A. Bakradze 7, 0159 Tbilisi</p><p>+995 514 37 44 33</p><p>info@localhost.ge</p></div>
    </div>
    <div class="avatars">
      <div class="av cream">{img(2, "icon", w=90)}</div>
      <div class="av forest">{img(2, "icon-reverse", w=90)}</div>
      <div class="av-small"><div class="av cream s">{img(2, "icon", w=26)}</div><div class="av forest s">{img(2, "icon-reverse", w=26)}</div><span>40 px</span></div>
    </div>
  </div>
</section>'''


REFINEMENTS = [
    ('True geometry on a 12-unit grid',
     'The mark is exactly 12 × 12 units. The sun is a perfect circle of radius 3U filling the top half. Each hill is a true half-ellipse on the base line (5.8U high), so its outer side meets the base vertically, as in the original.'),
    ('45° slopes and a right-angled overlap',
     'The straight inner slopes now run at exactly 45° (the original wobbles between 40° and 44°). Each slope is tangent to its dome, so curve and line meet without a kink. The slopes cross at a right angle 4U above the base, which makes the overlap exactly half a square (the "diamond").'),
    ('Mirror symmetry',
     'The two hills are exact mirror images about the sun\'s axis. In the original the peaks, the slopes and the sun\'s centre are each a few pixels off, and the sun is slightly oval. All three options now share this one geometry (the AI drew a slightly different mark in each).'),
    ('Optical spacing',
     'The sun hovers 0.2U above the ridge line and keeps the same 0.85U gap to both hills (the original\'s gaps are uneven). The gap stays at least 1 px wide at 16 px.'),
    ('Wordmark',
     'Outfit (geometric, round O, pointed A) matches the original lettering and is outlined, so no font is needed. GPOS kerning plus optical pairs: a wider word space; E–O, R–G and I–A tightened in the letter-spaced GEORGIA. Weights 700, 650 and 500 set the three options. In the horizontal lockup, LOCAL HOST stands on the hills\' ridge line.'),
    ('Gradients and flat version',
     'Every gradient runs from one light source (top-left, 45°) with three stops. The middle stop is the flat colour, so the flat and gradient versions read the same at small sizes and in print. On dark green the hill greens are lifted in OKLCH lightness so the dark hill does not sink into the background.'),
    ('Clean files',
     'Each SVG uses true elliptical arcs and a `<circle>`, has a tight viewBox and gives every gradient an id prefixed with its file name (lh2-horizontal-sun and so on). Internal edges are drawn as an underlay plus planes, so no light seams appear between abutting shapes.'),
]


def page():
    notes = ''.join(f'<li><b>{html.escape(a)}</b><span>{html.escape(b).replace("`&lt;circle&gt;`", "<code>&lt;circle&gt;</code>")}</span></li>' for a, b in REFINEMENTS)
    refined_three = ''.join(f'<div class="r3">{img(n, "stacked", w=None, alt=f"Option {n}", cls="r3img")}<span class="r3n">Option {n}</span><b>{html.escape(OPTIONS[n]["name"])}</b></div>' for n in (1, 2, 3))
    css = open(os.path.join(HERE, 'page.css')).read()
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Local Host · chosen logo</title>
<meta name="description" content="The owner's chosen Local Host logo, redrawn as clean vectors in three colour options">
<style>
@font-face{{font-family:Outfit;src:url({NM}/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2) format("woff2");font-weight:100 900}}
@font-face{{font-family:"DM Sans";src:url({NM}/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2) format("woff2");font-weight:100 1000}}
{css}
</style>
</head>
<body>
<header class="intro">
  <p class="eyebrow">Local Host LLC · Tbilisi · Brand identity</p>
  <h1>The chosen logo, refined</h1>
  <p class="lede">The owner chose this mark and asked us to use it as a base: a sun (or a host's head) above two overlapping green hills, under the LOCAL HOST GEORGIA wordmark. The concept, layout and colours stay the same. The geometry, type and colour are redrawn as precise vectors in all three options. The website uses <b>Option 2</b>.</p>
</header>

<section class="ba" id="before-after">
  <div class="ba-grid">
    <figure class="ba-orig"><img src="{REF}" alt="The original logo options (raster mock-up)"><figcaption>Before: the original mock-up (AI-generated raster)</figcaption></figure>
    <figure class="ba-new"><div class="r3row">{refined_three}</div><figcaption>After: the refined vector logo, same three options</figcaption></figure>
  </div>
  <div class="ba-notes">
    <figure class="cons">{construction()}<figcaption>Construction on the 12-unit grid (U = 1/12 of the mark's width)</figcaption></figure>
    <ol class="refine">{notes}</ol>
  </div>
</section>
{option_section(1)}
{option_section(2)}
{option_section(3)}
{small_sizes()}
{mockups()}
<footer class="foot">
  <p><b>Files:</b> <code>design/logo/chosen/option-1…3/</code> stacked, horizontal, icon, mono, reverse, stacked-flat, horizontal-flat and icon-flat, plus stacked-reverse, icon-reverse, icon-mono, mono-white, mono-stacked and reverse-flat. The website's copies (Option 2) are in <code>src/assets/brand/</code>, and the favicon is <code>public/favicon.svg</code>. To rebuild, run <code>python3 design/logo/chosen/source/build.py</code> and then <code>page.py</code>.</p>
</footer>
</body>
</html>
'''


if __name__ == '__main__':
    write(os.path.join(OUT, 'index.html'), page())
    print('page written')
