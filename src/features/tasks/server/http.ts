import type { Result } from "../domain/task.ts";
import { NOT_FOUND, UNAUTHORIZED } from "./tasks.ts";

export const FORBIDDEN = "forbidden";
export const UNSUPPORTED_MEDIA_TYPE = "unsupported_media_type";
export const PAYLOAD_TOO_LARGE = "payload_too_large";

// The largest valid task (5 000-character note, 50 steps) is far below this.
export const MAX_BODY_BYTES = 64 * 1024;

const STATUS: Record<string, number> = {
  [UNAUTHORIZED]: 401,
  [FORBIDDEN]: 403,
  [NOT_FOUND]: 404,
  [PAYLOAD_TOO_LARGE]: 413,
  [UNSUPPORTED_MEDIA_TYPE]: 415,
};

/** HTTP status for a tasks error: anything unnamed is a validation error (400). */
export const statusFor = (error: string) => STATUS[error] ?? 400;

/** No shared cache, proxy or back/forward cache keeps a user's tasks. */
export const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * True when a write comes from this site: a CSRF guard on top of the SameSite cookie.
 * Browsers say so in `Sec-Fetch-Site`; without it, the `Origin` host must be the
 * requested host. `req.url` is not used: behind a proxy its host is not the browser's.
 */
export function isSameSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The JSON body of a write, or why it is refused: it must come from this site, be
 * JSON and stay small. Malformed JSON reads as `null`, which the domain rejects.
 */
export async function readJsonBody(req: Request): Promise<Result<unknown>> {
  if (!isSameSite(req)) return { ok: false, error: FORBIDDEN };
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false, error: UNSUPPORTED_MEDIA_TYPE };
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return { ok: false, error: PAYLOAD_TOO_LARGE };
  }
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { ok: false, error: PAYLOAD_TOO_LARGE };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: true, value: null };
  }
}
