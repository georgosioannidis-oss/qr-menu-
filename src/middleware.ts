/**
 * Protects dashboard routes: unauthenticated users are sent to /dashboard/login.
 * Owner and staff sessions use separate cookies; we pick the active JWT per path so two tabs can differ.
 */
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionTokenCookieName, shouldUseSecureAuthCookies } from "@/lib/auth-cookies";
import { pickDashboardSession, resolveDashboardPathnameForApi } from "@/lib/dashboard-session-pick";
import { CUSTOMER_PATHNAME_HEADER } from "@/lib/load-customer-table";

const DASHBOARD_PATH_HEADER = "x-dashboard-path";
const DASHBOARD_SESSION_PATH_HEADER = "x-dashboard-session-path";
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/m/")) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(CUSTOMER_PATHNAME_HEADER, path);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (path.startsWith("/api/dashboard")) {
    const ref = req.headers.get("referer") ?? "";
    let sessionPath = resolveDashboardPathnameForApi(ref);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(DASHBOARD_SESSION_PATH_HEADER, sessionPath);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (path === "/dashboard/floor" || path.startsWith("/dashboard/floor/")) {
    const u = req.nextUrl.clone();
    u.pathname = "/dashboard/wait-staff" + path.slice("/dashboard/floor".length);
    return NextResponse.redirect(u);
  }

  if (path.startsWith("/dashboard") && !path.startsWith("/dashboard/login")) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      const login = new URL("/dashboard/login", req.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }
    const secureCookie = shouldUseSecureAuthCookies();
    const [owner, staff] = await Promise.all([
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
    const { jwt } = pickDashboardSession(path, owner, staff);
    if (!jwt) {
      const login = new URL("/dashboard/login", req.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(DASHBOARD_PATH_HEADER, path);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*", "/m/:path*"],
};
