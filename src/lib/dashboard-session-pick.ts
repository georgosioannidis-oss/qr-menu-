import type { JWT } from "next-auth/jwt";
import { isOwnerRole } from "./dashboard-roles";

function jwtRole(j: JWT | null): string | undefined {
  return typeof j?.role === "string" ? j.role : undefined;
}

export type DashboardAuthChannel = "owner" | "staff";

function channelForPickedJwt(
  jwt: JWT | null,
  owner: JWT | null,
  staff: JWT | null
): DashboardAuthChannel | null {
  if (!jwt?.sub) return null;
  if (owner?.sub === jwt.sub) return "owner";
  if (staff?.sub === jwt.sub) return "staff";
  return null;
}

/**
 * When both owner and staff cookies exist, choose which JWT applies to this request.
 * Staff-priority routes match the Team / print flows; owner-priority matches Office / Options.
 * Else prefer an owner-capable JWT so Overview, Menu, Tables, and Orders stay on the owner session
 * when you also have a team login in the same browser (common when testing Office + Team in two tabs).
 */
export function pickDashboardSession(
  pathname: string,
  owner: JWT | null,
  staff: JWT | null
): { jwt: JWT | null; channel: DashboardAuthChannel | null } {
  if (!owner && !staff) return { jwt: null, channel: null };
  if (owner && !staff) return { jwt: owner, channel: "owner" };
  if (!owner && staff) return { jwt: staff, channel: "staff" };

  const staffFirst =
    pathname.startsWith("/dashboard/wait-staff") || pathname.startsWith("/dashboard/orders/print");
  if (staffFirst) {
    const jwt = staff ?? owner;
    return { jwt, channel: channelForPickedJwt(jwt, owner, staff) };
  }

  const ownerFirst =
    pathname.startsWith("/dashboard/office") || pathname.startsWith("/dashboard/branding");
  if (ownerFirst) {
    const jwt = owner ?? staff;
    return { jwt, channel: channelForPickedJwt(jwt, owner, staff) };
  }

  const oRole = jwtRole(owner);
  if (owner && isOwnerRole(oRole)) {
    return { jwt: owner, channel: "owner" };
  }
  const jwt = staff ?? owner;
  return { jwt, channel: channelForPickedJwt(jwt, owner, staff) };
}

export function resolveDashboardPathnameForApi(
  referer: string | null,
  fallback: string = "/dashboard"
): string {
  if (!referer) return fallback;
  try {
    const p = new URL(referer).pathname;
    if (p.startsWith("/dashboard")) return p;
  } catch {
    /* ignore */
  }
  return fallback;
}
