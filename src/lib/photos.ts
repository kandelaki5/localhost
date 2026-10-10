import type { ImageMetadata } from 'astro';

/**
 * Every photo in src/assets/photos, by file name without extension:
 *   getPhoto('kazbegi-gergeti')
 * Only metadata is loaded here; images are optimised when a <Figure> uses them.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  byName.set(name, mod.default);
}

export const PHOTO_NAMES: readonly string[] = [...byName.keys()].sort();

export function hasPhoto(name: string): boolean {
  return byName.has(name);
}

export function getPhoto(name: string): ImageMetadata {
  const photo = byName.get(name);
  if (!photo) {
    throw new Error(
      `[photos] "${name}" is not in src/assets/photos. Available: ${PHOTO_NAMES.join(', ')}`,
    );
  }
  return photo;
}
