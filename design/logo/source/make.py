"""Build every SVG deliverable + public/favicon.svg.

    pip install fonttools brotli uharfbuzz skia-pathops
    python3 design/logo/source/make.py
"""
import os
import shutil
from build import *
import c_door, c_mono, c_stamp, c_word

build_redraw()
emit('current-redraw', 'Current mark, redrawn', 'icon-reverse', redraw_icon('reverse'), 6)
emit('current-redraw', 'Current mark, redrawn', 'icon-mono', redraw_icon('mono'), 6)
for m in (c_door, c_mono, c_stamp, c_word):
    m.build(True)
    if m is c_stamp:
        emit(m.SLUG, m.NAME, 'icon-mono', m.icon('mono', ring=False), 2)
    else:
        emit(m.SLUG, m.NAME, 'icon-mono', m.icon('mono'), 2)

# favicon (temporary): current-redraw icon centred in a square viewBox
lay = redraw_icon('color')
x0, y0, x1, y1 = lbounds(lay)
side = max(x1 - x0, y1 - y0) * 1.04
box = ((x0 + x1) / 2 - side / 2, (y0 + y1) / 2 - side / 2, side, side)
write(os.path.join(REPO, 'public', 'favicon.svg'), svg(lay, 'Local Host', box=box))
print('built')
