import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_ORDERS = 30;
const GUEST_ORDER_HISTORY_HOURS = 24;

/**
 * GET /api/orders/for-table?tableToken=xxx&guestSessionId=yyy
 * Recent orders for this guest on this table. When guestSessionId is provided,
 * only orders placed by that device are returned.
 */
export async function GET(req: NextRequest) {
  const tableToken = req.nextUrl.searchParams.get("tableToken");
  if (!tableToken || typeof tableToken !== "string" || tableToken.length > 100) {
    return NextResponse.json({ error: "tableToken required" }, { status: 400 });
  }

  const table = await prisma.table.findUnique({
    where: { token: tableToken },
    select: {
      id: true,
      restaurant: { select: { waiterRelayEnabled: true } },
    },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const relayEnabled = table.restaurant.waiterRelayEnabled !== false;
  const since = new Date(Date.now() - GUEST_ORDER_HISTORY_HOURS * 60 * 60 * 1000);

  const guestSessionId = req.nextUrl.searchParams.get("guestSessionId");
  const where: Record<string, unknown> = {
    tableId: table.id,
    createdAt: { gte: since },
  };
  if (guestSessionId && typeof guestSessionId === "string" && guestSessionId.length <= 64) {
    where.guestSessionId = guestSessionId;
  }

  const rows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ORDERS,
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      waiterRelayAt: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json({
    orders: rows.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      itemCount: o._count.items,
      waiterRelayPending:
        relayEnabled && o.waiterRelayAt == null && o.status === "paid",
    })),
  });
}
