import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireWaitStaffApiAccess } from "@/lib/require-wait-staff-api";

/** GET /api/dashboard/wait-staff/waiter-call-count — tables with an active guest “call waiter”. */
export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireWaitStaffApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const count = await prisma.table.count({
    where: { restaurantId, waiterCalledAt: { not: null } },
  });

  return NextResponse.json({ count });
}
