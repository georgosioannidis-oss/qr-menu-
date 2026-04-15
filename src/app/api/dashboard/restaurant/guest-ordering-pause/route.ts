import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireOrdersSectionApi } from "@/lib/require-owner-api";

/** GET/PATCH guest QR ordering pause (Orders screen — kitchen overload). */
export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireOrdersSectionApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { guestQrOrderingPaused: true },
  });
  return NextResponse.json({ paused: r?.guestQrOrderingPaused === true });
}

export async function PATCH(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireOrdersSectionApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  let body: { paused?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const paused = body.paused === true;

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { guestQrOrderingPaused: paused },
  });
  return NextResponse.json({ paused });
}
