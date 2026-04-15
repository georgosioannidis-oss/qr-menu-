import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

type LayoutEntry = { sectionId: string; tableIds: string[] };

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

  const sectionIds = new Set<string>();
  const seenTableIds = new Set<string>();
  for (const row of layout) {
    if (!row || typeof row.sectionId !== "string" || !Array.isArray(row.tableIds)) {
      return NextResponse.json({ error: "Invalid layout row" }, { status: 400 });
    }
    sectionIds.add(row.sectionId);
    for (const tid of row.tableIds) {
      if (typeof tid !== "string") {
        return NextResponse.json({ error: "Invalid table id" }, { status: 400 });
      }
      if (seenTableIds.has(tid)) {
        return NextResponse.json({ error: "Duplicate table id in layout" }, { status: 400 });
      }
      seenTableIds.add(tid);
    }
  }

  const sectionIdList = Array.from(sectionIds);
  const sections = await prisma.tableSection.findMany({
    where: { restaurantId, id: { in: sectionIdList } },
  });
  if (sections.length !== sectionIds.size) {
    return NextResponse.json({ error: "Unknown section in layout" }, { status: 400 });
  }

  const allRestaurantSections = await prisma.tableSection.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const allSecIds = new Set(allRestaurantSections.map((s) => s.id));
  if (allSecIds.size !== sectionIds.size || !sectionIdList.every((id) => allSecIds.has(id))) {
    return NextResponse.json({ error: "Layout must list every section (tables can be empty arrays)" }, { status: 400 });
  }

  const allTables = await prisma.table.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const allTableIds = new Set(allTables.map((t) => t.id));
  if (seenTableIds.size !== allTableIds.size || ![...seenTableIds].every((id) => allTableIds.has(id))) {
    return NextResponse.json({ error: "Table list must include every restaurant table exactly once" }, { status: 400 });
  }

  await prisma.$transaction(
    layout.flatMap((row) =>
      row.tableIds.map((tableId, sortOrder) =>
        prisma.table.update({
          where: { id: tableId, restaurantId },
          data: { tableSectionId: row.sectionId, sortOrder },
        })
      )
    )
  );

  return NextResponse.json({ ok: true });
}
