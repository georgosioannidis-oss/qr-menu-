import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

async function checkCategory(id: string, restaurantId: string) {
  const cat = await prisma.menuCategory.findFirst({
    where: { id, restaurantId },
  });
  return cat;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const { id } = await params;
  const category = await checkCategory(id, restaurantId);
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const name = body.name != null ? String(body.name).trim().slice(0, 100) : undefined;
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : undefined;
  const isAvailable = typeof body.isAvailable === "boolean" ? body.isAvailable : undefined;
  const stationId = "stationId" in body
    ? (typeof body.stationId === "string" && body.stationId ? body.stationId : null)
    : undefined;

  const updated = await prisma.menuCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(stationId !== undefined && { stationId }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const { id } = await params;
  const category = await checkCategory(id, restaurantId);
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.menuCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
