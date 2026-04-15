import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  let body: { orderedCategoryIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ordered = body.orderedCategoryIds;
  if (!Array.isArray(ordered) || ordered.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedCategoryIds must be a string array" }, { status: 400 });
  }

  const unique = new Set(ordered);
  if (unique.size !== ordered.length) {
    return NextResponse.json({ error: "Duplicate category ids" }, { status: 400 });
  }

  const existing = await prisma.menuCategory.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((c) => c.id));
  if (existingIds.size !== ordered.length || !ordered.every((id) => existingIds.has(id))) {
    return NextResponse.json({ error: "Category list must match all restaurant categories" }, { status: 400 });
  }

  await prisma.$transaction(
    ordered.map((id, sortOrder) =>
      prisma.menuCategory.update({
        where: { id },
        data: { sortOrder },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
