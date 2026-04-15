import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

async function checkSection(id: string, restaurantId: string) {
  return prisma.tableSection.findFirst({
    where: { id, restaurantId },
  });
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
  const section = await checkSection(id, restaurantId);
  if (!section) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { name?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name != null ? String(body.name).trim().slice(0, 100) : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : undefined;

  const updated = await prisma.tableSection.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sortOrder !== undefined && { sortOrder }),
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
  const section = await checkSection(id, restaurantId);
  if (!section) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let reassignToSectionId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && typeof (body as { reassignToSectionId?: unknown }).reassignToSectionId === "string") {
      reassignToSectionId = (body as { reassignToSectionId: string }).reassignToSectionId.trim();
    }
  } catch {
    /* no body */
  }

  const tableCount = await prisma.table.count({ where: { tableSectionId: id } });
  if (tableCount > 0) {
    if (!reassignToSectionId || reassignToSectionId === id) {
      return NextResponse.json(
        {
          error:
            "This section still has tables. Send JSON body { \"reassignToSectionId\": \"<other-section-id>\" } to move them, then the section will be deleted.",
        },
        { status: 400 }
      );
    }

    const target = await prisma.tableSection.findFirst({
      where: { id: reassignToSectionId, restaurantId },
    });
    if (!target) {
      return NextResponse.json({ error: "Target section not found" }, { status: 400 });
    }

    const maxOrder = await prisma.table
      .aggregate({
        where: { tableSectionId: target.id },
        _max: { sortOrder: true },
      })
      .then((r) => r._max.sortOrder ?? -1);

    const tables = await prisma.table.findMany({
      where: { tableSectionId: id },
      orderBy: { sortOrder: "asc" },
    });

    await prisma.$transaction(
      tables.map((t, i) =>
        prisma.table.update({
          where: { id: t.id },
          data: {
            tableSectionId: target.id,
            sortOrder: maxOrder + 1 + i,
          },
        })
      )
    );
  }

  await prisma.tableSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
