/**
 * Coordinates for "Fig." captions: 42.6622, 44.6203 → 42°39′44″ N · 44°37′13″ E
 */
export type Coords = readonly [lat: number, lon: number] | { lat: number; lon: number };

function parts(value: number): [number, number, number] {
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = Math.round(((abs - d) * 60 - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }
  return [d, m, s];
}

export function toLatLon(c: Coords): { lat: number; lon: number } {
  return Array.isArray(c) ? { lat: c[0], lon: c[1] } : (c as { lat: number; lon: number });
}

/** precision 'dm' → 42°39′ N; 'dms' → 42°39′44″ N */
export function formatCoords(c: Coords, precision: 'dm' | 'dms' = 'dms'): string {
  const { lat, lon } = toLatLon(c);
  const one = (v: number, pos: string, neg: string) => {
    const [d, m, s] = parts(v);
    const sec = precision === 'dms' ? `${String(s).padStart(2, '0')}″` : '';
    return `${d}°${String(m).padStart(2, '0')}′${sec} ${v >= 0 ? pos : neg}`;
  };
  return `${one(lat, 'N', 'S')} · ${one(lon, 'E', 'W')}`;
}
