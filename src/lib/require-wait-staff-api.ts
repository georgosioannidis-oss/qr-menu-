import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDashboardAccess } from "@/lib/staff-permissions";

/**
 * Waiter screen APIs: owners and anyone with `waitStaff` dashboard access (incl. granular staff).
 */
export async function requireWaitStaffApiAccess(session: Session | null): Promise<NextResponse | null> {
  const restaurantId = session?.user?.restaurantId;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!restaurantId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.restaurantUser.findFirst({
    where: { id: userId, restaurantId },
    select: { disabled: true, role: true, permissions: true },
  });

  if (!row || row.disabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = resolveDashboardAccess(row);
  if (!access.waitStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
