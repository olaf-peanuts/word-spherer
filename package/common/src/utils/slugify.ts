import slugifyLib from 'slugify';

/**
 * Returns a URL‑safe slug.  If the slug already exists in DB,
 * caller must resolve collision (append -2, -3 …).
 */
export function generateSlug(title: string): string {
  // Remove diacritics, replace spaces with hyphens, lower case
  return slugifyLib(title, { lower: true, strict: true });
}
