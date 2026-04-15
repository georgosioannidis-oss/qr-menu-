import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

export async function GET() {
  const session = await getDashboardServerSession();
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      station: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { station: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const stationId = typeof body.stationId === "string" && body.stationId ? body.stationId : null;

    const maxOrder = await prisma.menuCategory
      .aggregate({
        where: { restaurantId },
        _max: { sortOrder: true },
      })
      .then((r) => (r._max.sortOrder ?? -1) + 1);

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name,
        sortOrder: maxOrder,
        ...(stationId && { stationId }),
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error("POST /api/dashboard/categories:", e);
    const message = e instanceof Error ? e.message : "Failed to create category";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
