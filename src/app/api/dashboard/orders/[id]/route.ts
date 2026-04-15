import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { sessionCanRelayIncomingGuestOrders } from "@/lib/staff-permissions";

const ALLOWED_STATUSES = ["preparing", "ready", "delivered"] as const;
const VALID_TRANSITIONS: Record<string, string[]> = {
  /** Awaiting card payment, or legacy row — kitchen can still start cooking (e.g. pay at table). */
  pending: ["preparing"],
  paid: ["preparing"],
  preparing: ["ready"],
  ready: ["delivered"],
};

/**
 * PATCH /api/dashboard/orders/[id]
 * - Body: { status: "preparing" | "ready" | "delivered" } — kitchen / owner flow
 * - Body: { relayToKitchen: true } — wait staff accepts → sends order to kitchen queue
 * - Body: { declineIncoming: true } — wait staff / owner declines before kitchen (status → declined)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  let body: { status?: string; relayToKitchen?: boolean; declineIncoming?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.declineIncoming === true) {
    if (!sessionCanRelayIncomingGuestOrders(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { restaurant: { select: { waiterRelayEnabled: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.restaurant.waiterRelayEnabled) {
      return NextResponse.json(
        {
          error:
            "Wait staff routing is off. Declining only applies to orders that wait in the wait staff queue.",
        },
        { status: 400 }
      );
    }
    if (order.waiterRelayAt) {
      return NextResponse.json({ error: "This order was already sent to the kitchen." }, { status: 400 });
    }
    if (order.status === "declined") {
      return NextResponse.json({ error: "This order was already declined." }, { status: 400 });
    }
    if (order.status !== "pending" && order.status !== "paid") {
      return NextResponse.json(
        { error: "Only pending or paid orders can be declined from the wait staff queue." },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "declined" },
    });

    return NextResponse.json({ ok: true, declined: true });
  }

  if (body.relayToKitchen === true) {
    if (!sessionCanRelayIncomingGuestOrders(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { restaurant: { select: { waiterRelayEnabled: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.restaurant.waiterRelayEnabled) {
      return NextResponse.json(
        {
          error:
            "Wait staff routing is off. Turn on “Send new orders to wait staff first” under Options, or orders go straight to the kitchen.",
        },
        { status: 400 }
      );
    }
    if (order.waiterRelayAt) {
      return NextResponse.json({ error: "This order was already sent to the kitchen." }, { status: 400 });
    }
    if (order.status !== "pending" && order.status !== "paid") {
      return NextResponse.json(
        { error: "Only unpaid or paid orders can be sent from wait staff." },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { waiterRelayAt: new Date() },
    });

    return NextResponse.json({ ok: true, relayed: true });
  }

  const newStatus = body.status;
  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json(
      {
        error:
          "status must be 'preparing', 'ready', or 'delivered', or use relayToKitchen: true / declineIncoming: true",
      },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { restaurant: { select: { waiterRelayEnabled: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "declined") {
    return NextResponse.json({ error: "This order was declined and cannot be updated." }, { status: 400 });
  }

  if (
    newStatus === "preparing" &&
    order.restaurant.waiterRelayEnabled &&
    !order.waiterRelayAt
  ) {
    return NextResponse.json(
      {
        error:
          "This order is still with wait staff. It must be sent to the kitchen before cooking can start.",
      },
      { status: 400 }
    );
  }

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot set status to '${newStatus}' from '${order.status}'` },
      { status: 400 }
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
