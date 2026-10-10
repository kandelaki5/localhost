"""Geometry of the chosen Local Host mark: a sun (the host's head) over two overlapping hills.

Everything is built on a 12 x 12 unit grid (U = one grid unit, the mark is exactly 12U square):

    sun      circle on the axis, radius 3U, filling the top half (top 0, bottom 6U)
    slopes   each hill's inner side is a straight line at exactly 45 deg, meeting the base 4U
             either side of the axis; the two slopes cross at a right angle on the axis, 4U
             above the base -> the overlap is a right isosceles triangle (half a square / diamond)
    hills    each hill is a half-ellipse dome standing on the base line, 5.8U high, outer side
             meeting the base vertically at 6U from the axis; its width is solved so the 45 deg
             slope is exactly tangent to the dome: rx = ((E+F)^2 - ry^2) / (2 (E+F)) = 3.318U,
             so the peaks sit 2.68U either side of the axis
    corners  the two outer base corners get a small 0.16U fillet (softened, as in the original)

The sun hovers 0.2U above the ridge line (as in the original); the closest gap between the sun
and either hill is 0.85U.

All path data is written analytically (true SVG elliptical arcs, exact mirror symmetry).
"""
import math

GRID = 12.0


def f(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def _isect(p1, d1, p2, d2):
    """Intersection of the lines p1 + t d1 and p2 + s d2."""
    den = d1[0] * d2[1] - d1[1] * d2[0]
    t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
    return (p1[0] + t * d1[0], p1[1] + t * d1[1])


class Mark:
    def __init__(self, u=10.0, x0=0.0, y0=0.0, ry=5.8, foot=4.0, half=6.0, rx=None, peak=None,
                 corner=0.16, sun_cy=3.0, sun_r=3.0):
        self.u = u
        self.x0, self.y0 = x0, y0
        self.W = self.H = GRID * u
        self.base = y0 + GRID * u
        self.cx = x0 + 6 * u
        if rx is None:   # solve the dome width so that the slope from the opposite foot is 45 deg
            ef = half + foot
            rx = (ef * ef - ry * ry) / (2 * ef)
        if peak is None:
            peak = half - rx
        self.rx, self.ry = rx * u, ry * u
        self.peak = peak * u      # dome centre offset from the axis
        self.foot = foot * u      # where each slope meets the base (offset from the axis)
        self.rc = corner * u
        self.sun_r = sun_r * u
        self.sun_cy = y0 + sun_cy * u

    # ---------------------------------------------------------------- key points (left side)
    def tangent(self):
        """Tangent point on the left dome of the line from the right foot."""
        d = (self.peak + self.foot) / self.rx
        ux = 1 / d
        uy = math.sqrt(1 - ux * ux)
        return (self.cx - self.peak + self.rx * ux, self.base - self.ry * uy)

    def v_point(self):
        tx, ty = self.tangent()
        fx = self.cx + self.foot
        t = (self.cx - tx) / (fx - tx)
        return (self.cx, ty + (self.base - ty) * t)

    def slope_deg(self):
        tx, ty = self.tangent()
        return math.degrees(math.atan2(self.base - ty, self.cx + self.foot - tx))

    def fillet_end(self):
        """Point on the outer side of the left dome, rc above the base (end of the fillet)."""
        yy = self.base - self.rc
        xe = (self.cx - self.peak) - self.rx * math.sqrt(1 - (self.rc / self.ry) ** 2)
        return xe, yy

    def mx(self, x):
        return 2 * self.cx - x

    # ---------------------------------------------------------------- path data
    def _left_outer(self, dx, dy):
        """M ... up the left outer side and over the dome to the tangent point."""
        xl = self.cx - self.peak - self.rx
        xe, ye = self.fillet_end()
        tx, ty = self.tangent()
        b, rc = self.base, self.rc
        return (f'M{f(xl + rc + dx)} {f(b + dy)}A{f(rc)} {f(rc)} 0 0 1 {f(xe + dx)} {f(ye + dy)}'
                f'A{f(self.rx)} {f(self.ry)} 0 0 1 {f(tx + dx)} {f(ty + dy)}')

    def _right_outer_down(self, dx, dy):
        """From the right tangent point over the right dome down to the right base corner."""
        xe, ye = self.fillet_end()
        b, rc = self.base, self.rc
        xr = self.cx + self.peak + self.rx
        return (f'A{f(self.rx)} {f(self.ry)} 0 0 1 {f(self.mx(xe) + dx)} {f(ye + dy)}'
                f'A{f(rc)} {f(rc)} 0 0 1 {f(xr - rc + dx)} {f(b + dy)}')

    def d_hills(self, dx=0, dy=0):
        """Silhouette of both hills (used as the overlap-coloured underlay)."""
        tx, ty = self.tangent()
        vx, vy = self.v_point()
        return (self._left_outer(dx, dy) + f'L{f(vx + dx)} {f(vy + dy)}L{f(self.mx(tx) + dx)} {f(ty + dy)}'
                + self._right_outer_down(dx, dy) + 'Z')

    def d_left_only(self, dx=0, dy=0):
        vx, vy = self.v_point()
        return (self._left_outer(dx, dy) + f'L{f(vx + dx)} {f(vy + dy)}'
                f'L{f(self.cx - self.foot + dx)} {f(self.base + dy)}Z')

    def d_right_only(self, dx=0, dy=0):
        tx, ty = self.tangent()
        vx, vy = self.v_point()
        return (f'M{f(vx + dx)} {f(vy + dy)}L{f(self.mx(tx) + dx)} {f(ty + dy)}' + self._right_outer_down(dx, dy)
                + f'L{f(self.cx + self.foot + dx)} {f(self.base + dy)}Z')

    def d_overlap(self, dx=0, dy=0):
        vx, vy = self.v_point()
        return (f'M{f(self.cx - self.foot + dx)} {f(self.base + dy)}L{f(vx + dx)} {f(vy + dy)}'
                f'L{f(self.cx + self.foot + dx)} {f(self.base + dy)}Z')

    def d_mono(self, gap, dx=0, dy=0):
        """The three hill planes separated by knockout gaps of width `gap` (one-colour version)."""
        tx, ty = self.tangent()
        vx, vy = self.v_point()
        b = self.base
        fl, fr = (self.cx - self.foot, b), (self.cx + self.foot, b)
        dA = (fr[0] - vx, fr[1] - vy)        # left hill slope, V -> right foot
        dB = (fl[0] - vx, fl[1] - vy)        # right hill slope, V -> left foot
        L = math.hypot(*dA)
        h = gap / 2
        nB = (-dB[1] / L, dB[0] / L)         # normal of line B, pointing to the left-only side
        if nB[0] > 0:
            nB = (-nB[0], -nB[1])
        nA = (-nB[0], nB[1])                 # mirror: pointing to the right-only side
        base_dir = (1, 0)
        # left-only piece: right edge = line B shifted by h towards the left piece
        pB = (vx + nB[0] * h, vy + nB[1] * h)
        v1 = _isect((tx, ty), (fr[0] - tx, fr[1] - ty), pB, dB)
        fB = _isect(pB, dB, (0, b), base_dir)
        left = (self._left_outer(dx, dy) + f'L{f(v1[0] + dx)} {f(v1[1] + dy)}L{f(fB[0] + dx)} {f(b + dy)}Z')
        right = (f'M{f(self.mx(v1[0]) + dx)} {f(v1[1] + dy)}L{f(self.mx(tx) + dx)} {f(ty + dy)}'
                 + self._right_outer_down(dx, dy) + f'L{f(self.mx(fB[0]) + dx)} {f(b + dy)}Z')
        # triangle: both edges shifted inwards by h
        pA_in = (vx - nA[0] * h, vy - nA[1] * h)   # line A shifted towards the triangle
        pB_in = (vx - nB[0] * h, vy - nB[1] * h)
        apex = _isect(pA_in, dA, pB_in, dB)
        t_l = _isect(pB_in, dB, (0, b), base_dir)
        t_r = _isect(pA_in, dA, (0, b), base_dir)
        tri = (f'M{f(t_l[0] + dx)} {f(b + dy)}L{f(apex[0] + dx)} {f(apex[1] + dy)}'
               f'L{f(t_r[0] + dx)} {f(b + dy)}Z')
        return left + right + tri

    def sun(self, dx=0, dy=0):
        return (self.cx + dx, self.sun_cy + dy, self.sun_r)

    def d_sun(self, dx=0, dy=0):
        cx, cy, r = self.sun(dx, dy)
        return f'M{f(cx - r)} {f(cy)}A{f(r)} {f(r)} 0 1 1 {f(cx + r)} {f(cy)}A{f(r)} {f(r)} 0 1 1 {f(cx - r)} {f(cy)}Z'

    # ---------------------------------------------------------------- boxes (for gradients)
    def box(self, piece):
        tx, ty = self.tangent()
        vx, vy = self.v_point()
        top = self.base - self.ry
        if piece == 'left':
            return (self.cx - self.peak - self.rx, top, vx, self.base)
        if piece == 'right':
            return (vx, top, self.cx + self.peak + self.rx, self.base)
        if piece == 'overlap':
            return (self.cx - self.foot, vy, self.cx + self.foot, self.base)
        if piece == 'sun':
            return (self.cx - self.sun_r, self.sun_cy - self.sun_r, self.cx + self.sun_r, self.sun_cy + self.sun_r)
        if piece == 'all':
            return (self.cx - self.peak - self.rx, self.sun_cy - self.sun_r, self.cx + self.peak + self.rx, self.base)

    def sun_gap(self, n=4000):
        """Smallest distance between the sun and the hills (numerically)."""
        tx, ty = self.tangent()
        vx, vy = self.v_point()
        best = 1e9
        for i in range(n + 1):
            th = math.pi / 2 * i / n
            x = self.cx - self.peak + self.rx * math.cos(th)
            y = self.base - self.ry * math.sin(th)
            if x <= tx:
                best = min(best, math.hypot(x - self.cx, y - self.sun_cy) - self.sun_r)
            t = i / n
            x, y = tx + (vx - tx) * t, ty + (vy - ty) * t
            best = min(best, math.hypot(x - self.cx, y - self.sun_cy) - self.sun_r)
        return best


if __name__ == '__main__':
    m = Mark(u=1)
    print('rx', round(m.rx, 4), 'peak', round(m.peak, 4), 'tangent', m.tangent(), 'V', m.v_point(),
          'slope', round(m.slope_deg(), 3), 'sun gap (U)', round(m.sun_gap(), 3))
