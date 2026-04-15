import type { NextRequest } from "next/server";
import { headers } from "next/headers";

function baseFromEnv(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
}

function joinBaseFromHeaderGetter(get: (name: string) => string | null): string {
  const rawHost = get("x-forwarded-host") ?? get("host");
  const host = rawHost?.split(",")[0]?.trim() ?? "";
  if (!host) return "";
  const protoRaw = get("x-forwarded-proto")?.trim() ?? "";
  const proto =
    protoRaw === "http" || protoRaw === "https"
      ? protoRaw
      : process.env.VERCEL
        ? "https"
        : "http";
  return `${proto}://${host}`;
}

/**
 * Full URL for `/join/[token]`.
 * Uses `NEXT_PUBLIC_APP_URL` when set; otherwise the current request host (so copied links work when shared).
 */
export async function staffJoinUrl(token: string): Promise<string> {
  const env = baseFromEnv();
  if (env) return `${env}/join/${token}`;
  const h = await headers();
  const base = joinBaseFromHeaderGetter((name) => h.get(name));
  if (base) return `${base}/join/${token}`;
  return `/join/${token}`;
}

/** Same as {@link staffJoinUrl} but uses a `Request` (e.g. Route Handlers). */
export function staffJoinUrlFromRequest(req: NextRequest, token: string): string {
  const env = baseFromEnv();
  if (env) return `${env}/join/${token}`;
  const base = joinBaseFromHeaderGetter((name) => req.headers.get(name));
  if (base) return `${base}/join/${token}`;
  return `/join/${token}`;
}

