import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stations = await prisma.station.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(stations);
}

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const station = await prisma.station.create({
    data: { restaurantId, name },
  });
  return NextResponse.json(station);
}
