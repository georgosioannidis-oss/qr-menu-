import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireFloorQueueApi } from "@/lib/require-floor-api";

/**
 * GET /api/dashboard/orders/incoming
 * Orders not yet sent to the kitchen (waiterRelayAt is null). Owner & waiter only.
 */
export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = requireFloorQueueApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const incomingWhere = {
    restaurantId,
    waiterRelayAt: null,
    status: { notIn: ["delivered", "declined"] as string[] },
    restaurant: { waiterRelayEnabled: true },
  };

  /** Badge polling only — avoids loading full orders + line items on a timer. */
  if (new URL(req.url).searchParams.get("countOnly") === "1") {
    const count = await prisma.order.count({ where: incomingWhere });
    return NextResponse.json({ count });
  }

  /** One round-trip: avoids separate Restaurant read before Order list (important on slow/high-latency DB links). */
  const orders = await prisma.order.findMany({
    where: incomingWhere,
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      table: { select: { name: true, token: true } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
  });

  return NextResponse.json(orders);
}
