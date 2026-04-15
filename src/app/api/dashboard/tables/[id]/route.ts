import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const { id } = await params;
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
  });
  if (!table) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.table.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  let body: { name?: string; tableSectionId?: string | null; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = await params;
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
  });
  if (!table) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { name?: string; tableSectionId?: string; sortOrder?: number } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.tableSectionId !== undefined) {
    if (body.tableSectionId === null || body.tableSectionId === "") {
      return NextResponse.json({ error: "Every table must stay in a section" }, { status: 400 });
    }
    if (typeof body.tableSectionId !== "string") {
      return NextResponse.json({ error: "Invalid tableSectionId" }, { status: 400 });
    }
    const sid = body.tableSectionId.trim();
    const sec = await prisma.tableSection.findFirst({
      where: { id: sid, restaurantId },
    });
    if (!sec) {
      return NextResponse.json({ error: "Section not found" }, { status: 400 });
    }
    data.tableSectionId = sec.id;
  }

  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number") {
      return NextResponse.json({ error: "Invalid sortOrder" }, { status: 400 });
    }
    data.sortOrder = body.sortOrder;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(table);
  }

  const updated = await prisma.table.update({ where: { id }, data });
  return NextResponse.json(updated);
}
