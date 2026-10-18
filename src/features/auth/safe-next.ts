const FALLBACK = "/today";
const ORIGIN = "http://next.invalid";

/**
 * The page to return to after logging in: a path on this site, or /today. Rejects
 * anything a browser could read as another origin ("//evil.com", "/\evil.com",
 * "https://evil.com") and control characters.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return FALLBACK;
  // Browsers treat "\" as "/", and strip tabs and newlines from URLs.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return FALLBACK;
  try {
    const url = new URL(next, ORIGIN);
    if (url.origin !== ORIGIN) return FALLBACK;
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}
