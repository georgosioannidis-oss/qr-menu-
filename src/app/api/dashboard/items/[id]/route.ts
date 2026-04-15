import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";
import { normalizePublicMediaUrl } from "@/lib/media-url";

async function checkItem(id: string, restaurantId: string) {
  const item = await prisma.menuItem.findFirst({
    where: { id, category: { restaurantId } },
  });
  return item;
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
  const item = await checkItem(id, restaurantId);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updates: {
      name?: string;
      description?: string | null;
      price?: number;
      isAvailable?: boolean;
      quickPrep?: boolean;
      sortOrder?: number;
      imageUrl?: string | null;
      optionGroups?: string | null;
      stationId?: string | null;
    } = {};
    if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 200);
    if (body.description !== undefined)
      updates.description = body.description === "" ? null : String(body.description).trim().slice(0, 1000);
    if (typeof body.price === "number" && Number.isInteger(body.price) && body.price >= 0)
      updates.price = body.price;
    if (typeof body.isAvailable === "boolean") updates.isAvailable = body.isAvailable;
    if (typeof body.quickPrep === "boolean") updates.quickPrep = body.quickPrep;
    if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
    if (body.imageUrl !== undefined) {
      if (body.imageUrl == null || body.imageUrl === "") updates.imageUrl = null;
      else {
        const raw = String(body.imageUrl).trim().slice(0, 500);
        updates.imageUrl = normalizePublicMediaUrl(raw) ?? raw;
      }
    }
    if (body.optionGroups !== undefined)
      updates.optionGroups =
        body.optionGroups == null || body.optionGroups === ""
          ? null
          : typeof body.optionGroups === "string"
            ? body.optionGroups
            : JSON.stringify(body.optionGroups);
    if (body.stationId !== undefined)
      updates.stationId =
        typeof body.stationId === "string" && body.stationId ? body.stationId : null;

    const updated = await prisma.menuItem.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/dashboard/items:", e);
    const message = e instanceof Error ? e.message : "Failed to save item";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
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
  const item = await checkItem(id, restaurantId);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
