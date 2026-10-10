/**
 * 05 · Connection — client behaviour: TBS/KUT tabs, the split-flap animation,
 * "All 20 cities" and the live Tbilisi clock.
 *
 * - Flaps only animate while the boards are on screen (IntersectionObserver);
 *   leaving the viewport finishes every flap at once. One requestAnimationFrame
 *   loop drives all of them and stops as soon as nothing is moving.
 * - Reduced motion: final characters straight away; the clock just updates.
 * - The flaps are aria-hidden; screen readers read the static text beside them.
 */

interface Cell {
  el: HTMLElement;
  target: string;
  set: string;
}

interface Row {
  el: HTMLElement;
  cells: Cell[];
  pending: number;
}

interface Board {
  panel: HTMLElement;
  rows: Row[];
  clock: Cell[];
  clockText: HTMLTimeElement | null;
  introduced: boolean;
}

interface Job {
  cell: Cell;
  at: number;
  left: number;
  row?: Row;
}

const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

export function initConnection(root: HTMLElement): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => !reduced.matches;
  const glyphs = root.dataset.glyphs || LATIN;
  const cell = (el: HTMLElement): Cell => ({
    el,
    target: el.textContent || ' ',
    set: el.dataset.fl === 'city' ? glyphs : el.dataset.fl === 'digit' ? DIGITS : LATIN,
  });

  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-cn-tab]')];
  const boards: Board[] = [...root.querySelectorAll<HTMLElement>('[data-cn-panel]')].map((panel) => ({
    panel,
    rows: [...panel.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({
      el,
      cells: [...el.querySelectorAll<HTMLElement>('[data-fl]')].map(cell),
      pending: 0,
    })),
    clock: [...panel.querySelectorAll<HTMLElement>('[data-clock] [data-fl]')].map(cell),
    clockText: panel.querySelector<HTMLTimeElement>('[data-clock-text]'),
    introduced: false,
  }));
  if (!boards.length) return;

  let active = Math.max(
    0,
    boards.findIndex((b) => b.panel.hasAttribute('data-active')),
  );
  let visible = false;
  let expanded = false;

  // ── the flap engine ──────────────────────────────────────────────────────
  const jobs = new Map<HTMLElement, Job>();
  let raf = 0;
  const tick = () => (parseFloat(getComputedStyle(root).getPropertyValue('--dur-instant')) || 70) * 0.85;

  const show = (c: Cell, ch: string) => {
    if (c.el.textContent === ch) return;
    c.el.textContent = ch;
    c.el.dataset.t = c.el.dataset.t === 'a' ? 'b' : 'a';
  };
  /** A row is "off" (lamp dark, airline dimmed) while its flaps are still moving. */
  const lamp = (r: Row, on: boolean) => r.el.toggleAttribute('data-off', !on);

  const frame = (now: number) => {
    raf = 0;
    const step = tick();
    for (const [el, job] of jobs) {
      if (now < job.at) continue;
      if (job.left > 0) {
        job.left -= 1;
        show(job.cell, job.cell.set[(Math.random() * job.cell.set.length) | 0]);
        job.at = now + step;
      } else {
        show(job.cell, job.cell.target);
        jobs.delete(el);
        if (job.row && --job.row.pending <= 0) lamp(job.row, true);
      }
    }
    if (jobs.size) raf = requestAnimationFrame(frame);
  };

  const spin = (c: Cell, delay: number, steps: number, row?: Row) => {
    const prev = jobs.get(c.el);
    if (prev?.row) prev.row.pending -= 1;
    if (row) row.pending += 1;
    jobs.set(c.el, { cell: c, at: performance.now() + delay, left: steps, row });
    if (!raf) raf = requestAnimationFrame(frame);
  };

  /** Lands every moving flap on its final character now. */
  const finish = () => {
    for (const job of jobs.values()) {
      job.cell.el.textContent = job.cell.target;
      if (job.row) {
        job.row.pending = 0;
        lamp(job.row, true);
      }
    }
    jobs.clear();
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const settle = (b: Board) => {
    for (const r of b.rows) {
      for (const c of r.cells) c.el.textContent = c.target;
      lamp(r, true);
    }
  };

  const blank = (rows: Row[]) => {
    for (const r of rows) {
      for (const c of r.cells) c.el.textContent = ' ';
      lamp(r, false);
    }
  };

  const shownRows = (b: Board) => b.rows.filter((r) => expanded || !r.el.hasAttribute('data-extra'));

  /** Flaps `rows` to their targets, row by row; optionally starting from another board's characters. */
  const run = (b: Board, rows: Row[], from?: Board) => {
    rows.forEach((r, ri) => {
      lamp(r, false);
      const before = from?.rows[b.rows.indexOf(r)];
      r.cells.forEach((c, k) => {
        if (from) c.el.textContent = before?.cells[k]?.el.textContent || ' ';
        const steps = c.target === ' ' ? (Math.random() * 3) | 0 : 3 + ((Math.random() * 5) | 0) + (ri % 3);
        spin(c, ri * 70 + k * 16 + Math.random() * 50, steps, r);
      });
    });
  };

  const intro = (b: Board) => {
    if (b.introduced) return;
    b.introduced = true;
    if (motion()) run(b, shownRows(b));
    else settle(b);
  };

  // ── the Tbilisi clock ───────────────────────────────────────────────────
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tbilisi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let clockTimer = 0;

  const clockTick = (animate: boolean) => {
    const parts = time.formatToParts(new Date());
    const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const digits = `${hh}${mm}`;
    const b = boards[active];
    b.clock.forEach((c, k) => {
      c.target = digits[k] ?? ' ';
      if (c.el.textContent === c.target) return;
      if (animate && visible && motion()) spin(c, k * 60, 2 + k);
      else c.el.textContent = c.target;
    });
    if (b.clockText) {
      b.clockText.textContent = `${hh}:${mm}`;
      b.clockText.dateTime = `${hh}:${mm}`;
    }
  };

  const clockStop = () => {
    window.clearTimeout(clockTimer);
    clockTimer = 0;
  };

  const clockStart = () => {
    clockStop();
    clockTick(true);
    const next = () => {
      clockTick(true);
      clockTimer = window.setTimeout(next, 60_000 - (Date.now() % 60_000) + 50);
    };
    clockTimer = window.setTimeout(next, 60_000 - (Date.now() % 60_000) + 50);
  };

  // ── tabs ────────────────────────────────────────────────────────────────
  const select = (i: number, focus = false) => {
    if (focus) tabs[i]?.focus();
    if (i === active || !boards[i]) return;
    const from = boards[active];
    const to = boards[i];
    finish();
    tabs.forEach((tab, k) => {
      tab.setAttribute('aria-selected', String(k === i));
      tab.tabIndex = k === i ? 0 : -1;
    });
    from.panel.removeAttribute('data-active');
    from.panel.hidden = true;
    to.panel.setAttribute('data-active', '');
    to.panel.hidden = false;
    active = i;
    clockTick(false);

    if (!motion()) {
      settle(to);
      to.introduced = true;
    } else if (!visible) {
      blank(shownRows(to));
      to.introduced = false;
    } else {
      to.introduced = true;
      run(to, shownRows(to), from);
    }
  };

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  root.querySelector('[data-cn-tablist]')?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  });

  // ── "All 20 cities" ─────────────────────────────────────────────────────
  const moreButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-more]')];
  const setExpanded = (on: boolean, button: HTMLButtonElement) => {
    expanded = on;
    root.toggleAttribute('data-expanded', on);
    for (const b of moreButtons) {
      b.setAttribute('aria-expanded', String(on));
      const label = b.querySelector('[data-more-label]');
      if (label) label.textContent = (on ? b.dataset.labelLess : b.dataset.labelMore) ?? '';
    }
    root.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => {
      c.textContent = (on ? c.dataset.expanded : c.dataset.collapsed) ?? c.textContent;
    });
    const extra = boards[active].rows.filter((r) => r.el.hasAttribute('data-extra'));
    if (on && visible && motion()) {
      blank(extra);
      run(boards[active], extra);
    } else if (!on) {
      finish();
      button.scrollIntoView({ block: 'nearest' });
    }
  };
  moreButtons.forEach((b) => b.addEventListener('click', () => setExpanded(!expanded, b)));

  // ── visibility ──────────────────────────────────────────────────────────
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      if (!entry.isIntersecting) {
        if (!visible) return;
        visible = false;
        finish();
        clockStop();
        root.removeAttribute('data-cn-live');
      } else if (!visible && entry.intersectionRatio >= 0.12) {
        visible = true;
        intro(boards[active]);
        clockStart();
        root.setAttribute('data-cn-live', '');
      }
    },
    { threshold: [0, 0.12, 0.3] },
  );
  const area = root.querySelector('[data-cn-boards]');
  if (area) io.observe(area);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clockStop();
    else if (visible) clockStart();
  });

  reduced.addEventListener('change', () => {
    if (motion()) return;
    finish();
    boards.forEach((b) => {
      settle(b);
      b.introduced = true;
    });
  });

  window.addEventListener('beforeprint', () => {
    finish();
    boards.forEach(settle);
  });

  // ── start ───────────────────────────────────────────────────────────────
  // Tab semantics only exist with JS (without it both boards simply stack).
  boards.forEach((b, i) => {
    b.panel.setAttribute('role', 'tabpanel');
    b.panel.tabIndex = 0;
    if (b.panel.dataset.tab) b.panel.setAttribute('aria-labelledby', b.panel.dataset.tab);
    b.panel.hidden = i !== active;
  });
  clockTick(false);
  if (motion()) blank(shownRows(boards[active]));
  else boards.forEach((b) => (b.introduced = true));
}
