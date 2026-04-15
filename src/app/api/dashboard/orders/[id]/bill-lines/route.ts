import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireWaitStaffApiAccess } from "@/lib/require-wait-staff-api";

async function syncOrderBillPaidAt(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { billLinePaid: true },
  });
  const allPaid = items.length > 0 && items.every((i) => i.billLinePaid);
  await prisma.order.update({
    where: { id: orderId },
    data: { billPaidAt: allPaid ? new Date() : null },
  });
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: { billPaidAt: true },
  });
  return { allPaid, billPaidAt: row?.billPaidAt ?? null };
}

/**
 * PATCH /api/dashboard/orders/[id]/bill-lines
 * Body: { orderItemId: string, billLinePaid: boolean } | { markAllLinesPaid: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireWaitStaffApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;
  const { id: orderId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === "declined") {
    return NextResponse.json({ error: "Cannot settle a declined order." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;

  if (o.markAllLinesPaid === true) {
    await prisma.orderItem.updateMany({
      where: { orderId },
      data: { billLinePaid: true },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { billPaidAt: new Date() },
    });
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      select: { billPaidAt: true },
    });
    return NextResponse.json({
      ok: true,
      billPaidAt: row?.billPaidAt?.toISOString() ?? null,
      allLinesPaid: true,
    });
  }

  const orderItemId = o.orderItemId;
  const billLinePaid = o.billLinePaid;
  if (typeof orderItemId !== "string" || typeof billLinePaid !== "boolean") {
    return NextResponse.json(
      { error: "Provide { orderItemId, billLinePaid } or { markAllLinesPaid: true }" },
      { status: 400 }
    );
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, orderId },
  });
  if (!item) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { billLinePaid },
  });

  const { allPaid, billPaidAt } = await syncOrderBillPaidAt(orderId);

  return NextResponse.json({
    ok: true,
    billPaidAt: billPaidAt?.toISOString() ?? null,
    allLinesPaid: allPaid,
  });
}
