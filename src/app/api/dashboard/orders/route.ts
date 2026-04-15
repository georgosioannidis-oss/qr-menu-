import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { ordersInKitchenQueueWhere } from "@/lib/kitchen-queue";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const history = searchParams.get("history") === "1";

  const where = history
    ? { restaurantId, status: { in: ["delivered", "declined"] } }
    : ordersInKitchenQueueWhere(restaurantId);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      table: { select: { name: true, token: true } },
      items: {
        include: {
          menuItem: {
            select: {
              name: true, stationId: true,
              station: { select: { id: true, name: true } },
              category: { select: { stationId: true, station: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(orders);
}
