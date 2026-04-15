import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

async function checkStation(id: string, restaurantId: string) {
  return prisma.station.findFirst({ where: { id, restaurantId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const station = await checkStation(id, restaurantId);
  if (!station) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const updated = await prisma.station.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const station = await checkStation(id, restaurantId);
  if (!station) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.station.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
