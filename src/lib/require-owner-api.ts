import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { isOwnerCapableRole } from "./restaurant-user-policy";
import { STAFF_GRANULAR_ROLE } from "./dashboard-roles";
import { resolveDashboardAccess } from "./staff-permissions";

/**
 * Kitchen / orders queue features: anyone who can open the Orders dashboard section.
 */
export async function requireOrdersSectionApi(session: Session | null): Promise<NextResponse | null> {
  const ctx = await loadDbUser(session);
  if (!ctx || ctx.row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = resolveDashboardAccess(ctx.row);
  if (!access.orders) {
    return NextResponse.json({ error: "You don’t have access to orders." }, { status: 403 });
  }
  return null;
}

type DbUserRow = {
  role: string;
  permissions: unknown;
  disabled: boolean;
};

async function loadDbUser(
  session: Session | null
): Promise<{ restaurantId: string; userId: string; row: DbUserRow } | null> {
  const restaurantId = session?.user?.restaurantId;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!restaurantId || !userId) return null;

  const row = await prisma.restaurantUser.findFirst({
    where: { id: userId, restaurantId },
    select: { role: true, permissions: true, disabled: true },
  });
  if (!row) return null;
  return { restaurantId, userId, row };
}

/** Co-owners and legacy owner-capable roles (not granular `staff`). */
export async function requireTrueOwnerApi(session: Session | null): Promise<NextResponse | null> {
  const ctx = await loadDbUser(session);
  if (!ctx || ctx.row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.row.role === STAFF_GRANULAR_ROLE || !isOwnerCapableRole(ctx.row.role)) {
    return NextResponse.json(
      { error: "Only a full owner account can do this. Sign out and use the Owner tab." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Office / team management APIs: full owners, or granular staff with Office permission.
 */
export async function requireManagementApi(session: Session | null): Promise<NextResponse | null> {
  const ctx = await loadDbUser(session);
  if (!ctx || ctx.row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = resolveDashboardAccess(ctx.row);
  if (!access.isTrueOwner && !access.office) {
    return NextResponse.json(
      { error: "You don’t have permission to manage team or invites." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Options / branding / print-agent style settings: full owners, or granular staff with Options permission.
 */
export async function requireBrandingApi(session: Session | null): Promise<NextResponse | null> {
  const ctx = await loadDbUser(session);
  if (!ctx || ctx.row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = resolveDashboardAccess(ctx.row);
  if (!access.isTrueOwner && !access.branding) {
    return NextResponse.json(
      { error: "You don’t have permission to change these options." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Read restaurant settings (branding page, Office prefs).
 */
export async function requireRestaurantReadApi(session: Session | null): Promise<NextResponse | null> {
  const ctx = await loadDbUser(session);
  if (!ctx || ctx.row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = resolveDashboardAccess(ctx.row);
  if (!access.isTrueOwner && !access.branding && !access.office) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return null;
}

/**
 * Full owners only (print agent, promoting co-owners, owner invites).
 */
export async function requireOwnerApi(session: Session | null): Promise<NextResponse | null> {
  return requireTrueOwnerApi(session);
}
