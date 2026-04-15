import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireManagementApi } from "@/lib/require-owner-api";

export async function GET() {
  const session = await getDashboardServerSession();
  const forbidden = await requireManagementApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const users = await prisma.restaurantUser.findMany({
    where: { restaurantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        disabled: true,
        title: true,
        permissions: true,
        createdAt: true,
      },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return NextResponse.json({ users });
}
