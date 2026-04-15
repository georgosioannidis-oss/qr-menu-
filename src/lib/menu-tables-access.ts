import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hasKitchenQueueAccess,
  hasWaitStaffAccess,
  STAFF_GRANULAR_ROLE,
} from "@/lib/dashboard-roles";
import { resolveDashboardAccess, defaultDashboardHome } from "@/lib/staff-permissions";

const STAFF_LOCKED_MSG =
  "Menu and tables are locked for staff. Ask an owner to enable “Owners + staff” in Office, or sign out and back in.";

/**
 * Resolves the signed-in user's **current** role from the database (JWT `role` can lag after Office changes).
 */
async function menuTablesAccessForSession(session: Session | null): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const restaurantId = session?.user?.restaurantId;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!restaurantId || !userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const row = await prisma.restaurantUser.findFirst({
    where: { id: userId, restaurantId },
    select: {
      role: true,
      disabled: true,
      permissions: true,
      restaurant: { select: { staffMayEditMenuTables: true } },
    },
  });

  if (!row || row.disabled) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const access = resolveDashboardAccess(row);

  if (access.isTrueOwner) {
    return { ok: true };
  }

  if (row.role === STAFF_GRANULAR_ROLE) {
    if (access.menu || access.tables) {
      return { ok: true };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You don't have permission to edit the menu or tables." },
        { status: 403 }
      ),
    };
  }

  const legacyStaff =
    hasKitchenQueueAccess(row.role) || hasWaitStaffAccess(row.role);
  if (legacyStaff) {
    if (row.restaurant?.staffMayEditMenuTables === true) {
      return { ok: true };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: STAFF_LOCKED_MSG }, { status: 403 }),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "You don't have permission to edit the menu or tables." },
      { status: 403 }
    ),
  };
}

/**
 * Owner-style accounts may always use menu & tables APIs.
 * Granular `staff` may when their permissions include menu or tables.
 * Legacy kitchen / wait / floor when `Restaurant.staffMayEditMenuTables` is true.
 */
export async function requireMenuTablesApiAccess(
  session: Session | null
): Promise<NextResponse | null> {
  const result = await menuTablesAccessForSession(session);
  if (!result.ok) return result.response;
  return null;
}

/** Staff hitting Menu or Tables when locked are sent to their primary screen. */
export async function ensureStaffMayEditMenuTablesOrRedirect(session: Session | null) {
  if (!session?.user?.restaurantId) return;
  const userId = (session.user as { id?: string }).id;
  if (!userId) return;

  const row = await prisma.restaurantUser.findFirst({
    where: { id: userId, restaurantId: session.user.restaurantId },
    select: {
      role: true,
      disabled: true,
      permissions: true,
      restaurant: { select: { staffMayEditMenuTables: true } },
    },
  });
  if (!row || row.disabled) return;

  const access = resolveDashboardAccess(row);
  if (access.isTrueOwner) return;
  if (row.role === STAFF_GRANULAR_ROLE && (access.menu || access.tables)) return;

  const legacyStaff =
    hasKitchenQueueAccess(row.role) || hasWaitStaffAccess(row.role);
  if (!legacyStaff) return;
  if (row.restaurant?.staffMayEditMenuTables === true) return;

  redirect(defaultDashboardHome(access));
}
