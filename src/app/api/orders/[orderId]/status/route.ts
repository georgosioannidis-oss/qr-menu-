import { NextRequest, NextResponse } from "next/server";
import {
  GUEST_LOAD_ORDER_STATUSES,
  loadAdjustedPrepMinutes,
} from "@/lib/guest-prep-time-estimate";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders/[orderId]/status?tableToken=xxx
 * Returns order status for guests. Validates that the order belongs to the table (via tableToken).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const tableToken = req.nextUrl.searchParams.get("tableToken");
  if (!tableToken) {
    return NextResponse.json({ error: "tableToken required" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, table: { token: tableToken } },
    select: {
      status: true,
      id: true,
      createdAt: true,
      restaurantId: true,
      waiterRelayAt: true,
      restaurant: {
        select: {
          prepTimeEstimateMinutes: true,
          waiterRelayEnabled: true,
        },
      },
      items: {
        select: {
          menuItem: { select: { quickPrep: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const lines = order.items;
  const prepTimeQuickOrder =
    lines.length > 0 && lines.every((row) => row.menuItem.quickPrep === true);

  const base = order.restaurant.prepTimeEstimateMinutes;
  let prepEffective: number | null = null;
  if (!prepTimeQuickOrder && base != null && base > 0) {
    const [ordersAhead, busyTables] = await Promise.all([
      prisma.order.count({
        where: {
          restaurantId: order.restaurantId,
          id: { not: order.id },
          status: { in: [...GUEST_LOAD_ORDER_STATUSES] },
          createdAt: { lt: order.createdAt },
        },
      }),
      prisma.order.groupBy({
        by: ["tableId"],
        where: {
          restaurantId: order.restaurantId,
          status: { in: [...GUEST_LOAD_ORDER_STATUSES] },
        },
      }),
    ]);
    prepEffective = loadAdjustedPrepMinutes(base, ordersAhead, busyTables.length);
  }

  const relayEnabled = order.restaurant.waiterRelayEnabled !== false;
  const waiterRelayPending =
    relayEnabled && order.waiterRelayAt == null && order.status === "paid";

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    orderCreatedAt: order.createdAt.toISOString(),
    prepTimeEstimateMinutes: prepEffective,
    prepTimeQuickOrder,
    waiterRelayPending,
  });
}
