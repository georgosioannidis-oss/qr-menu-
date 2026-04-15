import { cache } from "react";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { sessionTokenCookieName, shouldUseSecureAuthCookies } from "./auth-cookies";
import { getCachedRestaurantUserDashboardRow } from "./dashboard-request-cache";
import { pickDashboardSession, resolveDashboardPathnameForApi } from "./dashboard-session-pick";
import type { DashboardAuthChannel } from "./dashboard-session-pick";

const DASHBOARD_PATH_HEADER = "x-dashboard-path";
const DASHBOARD_SESSION_PATH_HEADER = "x-dashboard-session-path";

function buildSessionFromJwt(jwt: JWT, channel: DashboardAuthChannel): Session {
  const expSec = typeof jwt.exp === "number" ? jwt.exp : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  return {
    expires: new Date(expSec * 1000).toISOString(),
    dashboardAuthChannel: channel,
    user: {
      id: jwt.sub!,
      email: (jwt.email as string | undefined) ?? undefined,
      restaurantId: jwt.restaurantId as string,
      restaurantName: jwt.restaurantName as string,
      role: jwt.role as string | undefined,
      permissions: jwt.permissions,
      firstName: (jwt.firstName as string | null | undefined) ?? null,
      lastName: (jwt.lastName as string | null | undefined) ?? null,
    },
  };
}

const _getDashboardServerSessionCached = cache(async (): Promise<Session | null> => {
  return _getDashboardServerSessionImpl();
});

/**
 * Resolves the active dashboard session (owner cookie vs staff cookie) for this request.
 * Pass `req` from Route Handlers so API routes match the browser page (via Referer + middleware header).
 * Without `req`, the result is deduped via React.cache() across layouts and pages.
 */
export async function getDashboardServerSession(req?: NextRequest): Promise<Session | null> {
  if (!req) return _getDashboardServerSessionCached();
  return _getDashboardServerSessionImpl(req);
}

async function _getDashboardServerSessionImpl(req?: NextRequest): Promise<Session | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const secureCookie = shouldUseSecureAuthCookies();

  let pathname: string;
  let owner: JWT | null;
  let staff: JWT | null;

  if (req) {
    pathname =
      req.headers.get(DASHBOARD_SESSION_PATH_HEADER) ??
      resolveDashboardPathnameForApi(req.headers.get("referer"));
    [owner, staff] = await Promise.all([
      getToken({
        req,
        secret,
        cookieName: sessionTokenCookieName("owner"),
        secureCookie,
      }),
      getToken({
        req,
        secret,
        cookieName: sessionTokenCookieName("staff"),
        secureCookie,
      }),
    ]);
  } else {
    const h = await headers();
    const c = await cookies();
    pathname =
      h.get(DASHBOARD_PATH_HEADER) ?? h.get(DASHBOARD_SESSION_PATH_HEADER) ?? "/dashboard";
    const cookieRecord = Object.fromEntries(c.getAll().map((x) => [x.name, x.value]));
    const reqLike = {
      headers: Object.fromEntries(h.entries()),
      cookies: cookieRecord,
    };
    [owner, staff] = await Promise.all([
      getToken({
        req: reqLike as never,
        secret,
        cookieName: sessionTokenCookieName("owner"),
        secureCookie,
      }),
      getToken({
        req: reqLike as never,
        secret,
        cookieName: sessionTokenCookieName("staff"),
        secureCookie,
      }),
    ]);
  }

  const { jwt, channel } = pickDashboardSession(pathname, owner, staff);
  if (!jwt?.sub || !channel) return null;
  const session = buildSessionFromJwt(jwt, channel);
  try {
    const row = await getCachedRestaurantUserDashboardRow(jwt.sub);
    if (row?.disabled) return null;
    if (row) {
      if (row.email) session.user.email = row.email;
      session.user.firstName = row.firstName;
      session.user.lastName = row.lastName;
    }
  } catch {
    /* keep JWT-derived user if DB is unavailable */
  }
  return session;
}

/** @deprecated Use getDashboardServerSession() */
export async function getDashboardSession() {
  const session = await getDashboardServerSession();
  const restaurantId = session?.user?.restaurantId;
  if (!session || !restaurantId) return null;
  return { ...session, restaurantId };
}
