import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireWaitStaffApiAccess } from "@/lib/require-wait-staff-api";

/**
 * GET /api/dashboard/wait-staff/open-bills
 * Orders that still need table payment collection (waiter checklist). Excludes declined; includes unpaid-for-kitchen pending.
 */
export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireWaitStaffApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      billPaidAt: null,
      /** Pending usually means guest still in Stripe checkout — don’t ask waiters to collect yet. */
      status: { notIn: ["declined", "pending"] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      table: { select: { name: true, token: true } },
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json(orders);
}
