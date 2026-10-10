/**
 * The icon set used by Icon.astro. 24 × 24 grid, 1.5 px strokes, square caps.
 * Paths marked class="fill" are filled instead of stroked.
 * To add an icon: add a key here (keep the grid), then use <Icon name="…" />.
 */
export const ICONS = {
  'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  'arrow-up': '<path d="M12 20V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 4v15M6 13l6 6 6-6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M9 7h8v8"/>',
  sparkle:
    '<path class="fill" d="M10 2.5c.55 4.9 2.6 6.95 7.5 7.5-4.9.55-6.95 2.6-7.5 7.5-.55-4.9-2.6-6.95-7.5-7.5 4.9-.55 6.95-2.6 7.5-7.5z"/><path class="fill" d="M18.5 14c.28 2.3 1.2 3.22 3.5 3.5-2.3.28-3.22 1.2-3.5 3.5-.28-2.3-1.2-3.22-3.5-3.5 2.3-.28 3.22-1.2 3.5-3.5z"/>',
  pin: '<path d="M12 21.25c-4.6-5.4-7-8.9-7-12.15a7 7 0 1 1 14 0c0 3.25-2.4 6.75-7 12.15z"/><circle cx="12" cy="9.25" r="2.5"/>',
  phone:
    '<path d="M5.2 3.75h3.3l1.65 4.35-2.2 1.45a11.5 11.5 0 0 0 6.5 6.5l1.45-2.2 4.35 1.65v3.3a1.6 1.6 0 0 1-1.7 1.6A16.6 16.6 0 0 1 3.6 5.45a1.6 1.6 0 0 1 1.6-1.7z"/>',
  mail: '<rect x="3" y="5.25" width="18" height="13.5" rx="1"/><path d="m3.75 6.25 8.25 6.5 8.25-6.5"/>',
  globe:
    '<circle cx="12" cy="12" r="8.75"/><path d="M3.25 12h17.5M12 3.25c2.4 2.4 3.6 5.3 3.6 8.75s-1.2 6.35-3.6 8.75c-2.4-2.4-3.6-5.3-3.6-8.75S9.6 5.65 12 3.25z"/>',
  plane:
    '<path class="fill" d="M21 15.5v-1.8l-7.5-4.6V4.2a1.5 1.5 0 0 0-3 0v4.9L3 13.7v1.8l7.5-2.3v4.6l-2 1.5V21l3.5-1 3.5 1v-1.7l-2-1.5v-4.6z"/>',
  leaf: '<path d="M4.75 19.25C4.75 10.5 10 4.75 19.25 4.75c0 9.25-5.75 14.5-14.5 14.5z"/><path d="M4.75 19.25 13.5 10.5"/>',
  pdf: '<path d="M6 2.75h8.25L18.5 7v14.25H6z"/><path d="M14 2.75V7.25h4.5"/><path d="M9 12.25h6.5M9 15.25h6.5M9 18.25h4"/>',
  mic: '<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5M8.5 21h7"/>',
  speaker:
    '<path d="M3.75 9.25h3.5L12 5.25v13.5l-4.75-4H3.75z"/><path d="M15.5 9a4.25 4.25 0 0 1 0 6M18 6.25a8 8 0 0 1 0 11.5"/>',
  image:
    '<rect x="3.25" y="4.25" width="17.5" height="15.5" rx="1"/><circle cx="9" cy="9.75" r="1.75"/><path d="m3.75 17.25 5.25-5 4 4 2.75-2.75 4.75 4.5"/>',
  send: '<path d="M3.5 11.25 20.5 4l-7.25 16.5-2.75-6.75z"/><path d="M10.5 13.75 20.5 4"/>',
  check: '<path d="m4.75 12.5 4.5 4.5L19.25 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 8.5h16M4 15.5h16"/>',
  chevron: '<path d="m6 9.5 6 6 6-6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  external:
    '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5.25a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V6.75A.75.75 0 0 1 4.75 6H10"/>',
  calendar: '<rect x="3.75" y="5" width="16.5" height="15.25" rx="1"/><path d="M3.75 9.75h16.5M8 3v4M16 3v4"/>',
  users:
    '<circle cx="9" cy="8.5" r="3.25"/><path d="M3.5 19.5c.6-3.3 2.7-5 5.5-5s4.9 1.7 5.5 5"/><path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.5 14.9c1.6.6 2.6 2.1 3 4.6"/>',
  play: '<path class="fill" d="M8 5.5v13l10.5-6.5z"/>',
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
