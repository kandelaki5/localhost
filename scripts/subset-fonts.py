#!/usr/bin/env python3
"""Build the small "core Latin Extended" font subsets used by src/styles/fonts.css.

Why: fontsource ships one ~105-130 KB `latin-ext` file per Fraunces style. English,
Italian and German pages only need a handful of extended letters (the Polish member
names ŚIT / Śląska, Poznań, Chișinău on the board, Abşeron in DE). Those letters now
come from a tiny subset; the full fontsource `latin-ext` file is still declared, but
with the complementary unicode-range, so it downloads only for rarer letters.

Run after upgrading a @fontsource-variable package:
    python3 scripts/subset-fonts.py
Requires fonttools + brotli (pip install fonttools brotli). Prints the unicode-range
strings to paste into src/styles/fonts.css if CORE changes.
"""
import subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
NM = ROOT / 'node_modules' / '@fontsource-variable'
OUT = ROOT / 'src' / 'styles' / 'fonts'
OUT.mkdir(parents=True, exist_ok=True)

# Polish (ĄąĆćĘęŁłŃńŚśŹźŻż) + Romanian/Turkish letters used in content (Ăă Ğğ Şş Șș Țț).
CORE = [(0x0102, 0x0107), (0x0118, 0x0119), (0x011E, 0x011F), (0x0141, 0x0144),
        (0x015A, 0x015B), (0x015E, 0x015F), (0x0179, 0x017C), (0x0218, 0x021B)]

# fontsource latin-ext range (identical for all three families).
LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

def parse(r):
    out = set()
    for part in r.split(','):
        part = part.strip()[2:]
        a, _, b = part.partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out

def fmt(cps):
    cps = sorted(cps); ranges = []; start = prev = cps[0]
    for c in cps[1:]:
        if c == prev + 1: prev = c; continue
        ranges.append((start, prev)); start = prev = c
    ranges.append((start, prev))
    return ','.join(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in ranges)

core = set()
for a, b in CORE: core.update(range(a, b + 1))
rest = parse(LATIN_EXT) - core

JOBS = [
    ('fraunces/files/fraunces-latin-ext-full-normal.woff2', 'fraunces-core-ext-full-normal.woff2', core),
    ('fraunces/files/fraunces-latin-ext-full-italic.woff2', 'fraunces-core-ext-full-italic.woff2', core),
    ('dm-sans/files/dm-sans-latin-ext-opsz-normal.woff2', 'dm-sans-core-ext-opsz-normal.woff2', core),
    ('dm-sans/files/dm-sans-latin-ext-opsz-italic.woff2', 'dm-sans-core-ext-opsz-italic.woff2', core),
    ('jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2', 'jetbrains-mono-core-ext-wght-normal.woff2', core),
    # "№" (KA experience cards) lives in the Cyrillic file; keep just that glyph.
    ('jetbrains-mono/files/jetbrains-mono-cyrillic-wght-normal.woff2', 'jetbrains-mono-numero-wght-normal.woff2', {0x2116}),
]
for src, dst, cps in JOBS:
    subprocess.run(['pyftsubset', str(NM / src), '--unicodes=' + fmt(cps), "--layout-features=*",
                    '--flavor=woff2', '--output-file=' + str(OUT / dst)], check=True)
    print(f'{dst}: {(OUT / dst).stat().st_size} bytes (from {(NM / src).stat().st_size})')

print('\nCORE unicode-range:', fmt(core))
print('REST unicode-range:', fmt(rest))
