import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ordersInKitchenQueueWhere } from "@/lib/kitchen-queue";
import { restaurantForPrintAgentBearer } from "@/lib/print-agent-auth";

/**
 * POST /api/print-agent/ack
 * Authorization: Bearer <printAgentToken>
 * Body: { "orderId": "<cuid>" }
 *
 * Marks the order as printed by the agent (idempotent if already acked).
 */
export async function POST(req: NextRequest) {
  const restaurant = await restaurantForPrintAgentBearer(req.headers.get("authorization"));
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      AND: [{ id: orderId }, ordersInKitchenQueueWhere(restaurant.id)],
    },
    select: { id: true, kitchenTicketPrintedAt: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found or not in kitchen queue" }, { status: 404 });
  }

  if (order.kitchenTicketPrintedAt) {
    return NextResponse.json({ ok: true, alreadyAcked: true });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { kitchenTicketPrintedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
