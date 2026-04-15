import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";
import { normalizePublicMediaUrl } from "@/lib/media-url";

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const body = await req.json();
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const description =
    body.description != null ? String(body.description).trim().slice(0, 1000) : null;
  const price = typeof body.price === "number" ? Math.round(body.price) : NaN;
  const isAvailable = body.isAvailable !== false;
  const quickPrep = body.quickPrep === true;
  const imageRaw =
    body.imageUrl != null ? String(body.imageUrl).trim().slice(0, 500) : null;
  const imageUrl = imageRaw ? normalizePublicMediaUrl(imageRaw) ?? imageRaw : null;
  const optionGroups =
    body.optionGroups != null
      ? (typeof body.optionGroups === "string"
          ? body.optionGroups
          : JSON.stringify(body.optionGroups))
      : null;
  const stationId =
    typeof body.stationId === "string" && body.stationId ? body.stationId : null;

  if (!categoryId || !name) {
    return NextResponse.json({ error: "Category and name required" }, { status: 400 });
  }
  if (!Number.isInteger(price) || price < 0) {
    return NextResponse.json({ error: "Valid price required (cents)" }, { status: 400 });
  }

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const maxOrder = await prisma.menuItem
    .aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    })
    .then((r) => (r._max.sortOrder ?? -1) + 1);

  const item = await prisma.menuItem.create({
    data: {
      categoryId,
      name,
      description: description || null,
      price,
      isAvailable,
      quickPrep,
      sortOrder: maxOrder,
      imageUrl: imageUrl || null,
      optionGroups,
      stationId,
    },
  });
  return NextResponse.json(item);
}
