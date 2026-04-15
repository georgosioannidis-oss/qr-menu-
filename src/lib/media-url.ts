/**
 * Normalize stored image URLs so <img src> loads from the current deployment origin.
 * Uploads are saved as `/item-images/...` or `/logos/...`, but older rows may store a full
 * `http://127.0.0.1:3000/...` URL while you open the app on `http://localhost:3000`, which
 * can break loading. External URLs (other hosts, CDNs) are left unchanged.
 */
export function normalizePublicMediaUrl(url: string | null | undefined): string | undefined {
  if (url == null || typeof url !== "string") return undefined;
  const t = url.trim();
  if (!t) return undefined;
  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const p = `${u.pathname}${u.search}`;
      if (p.startsWith("/item-images/") || p.startsWith("/logos/")) return p;
      return t;
    }
  } catch {
    return t;
  }
  return t;
}
