import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ordersInKitchenQueueWhere } from "@/lib/kitchen-queue";
import { restaurantForPrintAgentBearer } from "@/lib/print-agent-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/print-agent/pending
 * Authorization: Bearer <printAgentToken>
 *
 * Returns kitchen-queue orders that have not been acknowledged by the print agent yet.
 */
export async function GET(req: NextRequest) {
  const restaurant = await restaurantForPrintAgentBearer(req.headers.get("authorization"));
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      AND: [ordersInKitchenQueueWhere(restaurant.id), { kitchenTicketPrintedAt: null }],
    },
    orderBy: { createdAt: "asc" },
    take: 25,
    include: {
      table: { select: { name: true, token: true } },
      restaurant: { select: { name: true } },
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  const payload = orders.map((o) => ({
    id: o.id,
    restaurantName: o.restaurant.name,
    tableName: o.table.name,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    totalAmount: o.totalAmount,
    items: o.items.map((row) => ({
      quantity: row.quantity,
      name: row.menuItem.name,
      unitPrice: row.unitPrice,
      notes: row.notes,
      selectedOptionsSummary: row.selectedOptionsSummary,
    })),
  }));

  return NextResponse.json({ orders: payload });
}
