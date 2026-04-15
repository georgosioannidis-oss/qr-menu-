import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

type LayoutEntry = { categoryId: string; itemIds: string[] };

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  let body: { layout?: LayoutEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const layout = body.layout;
  if (!Array.isArray(layout)) {
    return NextResponse.json({ error: "layout must be an array" }, { status: 400 });
  }

  const categoryIds = new Set<string>();
  const seenItemIds = new Set<string>();
  for (const row of layout) {
    if (!row || typeof row.categoryId !== "string" || !Array.isArray(row.itemIds)) {
      return NextResponse.json({ error: "Invalid layout row" }, { status: 400 });
    }
    categoryIds.add(row.categoryId);
    for (const iid of row.itemIds) {
      if (typeof iid !== "string") {
        return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
      }
      if (seenItemIds.has(iid)) {
        return NextResponse.json({ error: "Duplicate item id in layout" }, { status: 400 });
      }
      seenItemIds.add(iid);
    }
  }

  const categoryIdList = Array.from(categoryIds);
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, id: { in: categoryIdList } },
  });
  if (categories.length !== categoryIds.size) {
    return NextResponse.json({ error: "Unknown category in layout" }, { status: 400 });
  }

  const allRestaurantCategories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const allCatIds = new Set(allRestaurantCategories.map((c) => c.id));
  if (allCatIds.size !== categoryIds.size || !categoryIdList.every((id) => allCatIds.has(id))) {
    return NextResponse.json({ error: "Layout must list every category (items can be empty arrays)" }, { status: 400 });
  }

  const allItems = await prisma.menuItem.findMany({
    where: { category: { restaurantId } },
    select: { id: true },
  });
  const allItemIds = new Set(allItems.map((i) => i.id));
  if (seenItemIds.size !== allItemIds.size || ![...seenItemIds].every((id) => allItemIds.has(id))) {
    return NextResponse.json({ error: "Item list must include every menu item exactly once" }, { status: 400 });
  }

  await prisma.$transaction(
    layout.flatMap((row) =>
      row.itemIds.map((itemId, sortOrder) =>
        prisma.menuItem.update({
          where: { id: itemId },
          data: { categoryId: row.categoryId, sortOrder },
        })
      )
    )
  );

  return NextResponse.json({ ok: true });
}
