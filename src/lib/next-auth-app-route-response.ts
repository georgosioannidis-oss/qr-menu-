/**
 * NextAuth resolves `options.url` from `NEXTAUTH_URL` and defaults the path to `/api/auth`.
 * Our handlers live at `/api/auth-owner` and `/api/auth-staff`, so error/sign-in redirects
 * would otherwise point at removed `/api/auth/*` routes (404). Rewrite those URLs to match
 * the handler that served the request.
 */
import { NextResponse } from "next/server";

const LEGACY_PREFIX = "/api/auth";

function rewriteAuthUrl(urlString: string, req: Request, channel: "owner" | "staff"): string {
  try {
    const u = new URL(urlString, new URL(req.url).origin);
    if (u.pathname === LEGACY_PREFIX || u.pathname.startsWith(`${LEGACY_PREFIX}/`)) {
      if (!u.pathname.startsWith(`/api/auth-${channel}`)) {
        u.pathname = u.pathname.replace(LEGACY_PREFIX, `/api/auth-${channel}`);
      }
    }
    return u.toString();
  } catch {
    return urlString;
  }
}

export async function applyDualAuthRedirectFix(
  response: Response,
  req: Request,
  channel: "owner" | "staff"
): Promise<Response> {
  const location = response.headers.get("Location");
  if (location) {
    const next = rewriteAuthUrl(location, req, channel);
    if (next !== location) {
      const headers = new Headers(response.headers);
      headers.set("Location", next);
      return new NextResponse(response.body, { status: response.status, headers });
    }
  }

  const ct = response.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const text = await response.text();
    const outHeaders = new Headers(response.headers);
    try {
      const data = JSON.parse(text) as { url?: string };
      if (typeof data.url === "string") {
        const next = rewriteAuthUrl(data.url, req, channel);
        if (next !== data.url) {
          outHeaders.set("Content-Type", "application/json");
          return new NextResponse(JSON.stringify({ ...data, url: next }), {
            status: response.status,
            headers: outHeaders,
          });
        }
      }
    } catch {
      /* keep body */
    }
    return new NextResponse(text, { status: response.status, headers: outHeaders });
  }

  return response;
}
