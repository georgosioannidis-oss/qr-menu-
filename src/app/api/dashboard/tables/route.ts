import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

function slugToken(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "table";
  return base + "-" + Math.random().toString(36).slice(2, 8);
}

export async function GET() {
  const session = await getDashboardServerSession();
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: [{ tableSectionId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const tableSectionId =
    typeof body.tableSectionId === "string" && body.tableSectionId.trim()
      ? body.tableSectionId.trim()
      : "";
  if (!tableSectionId) {
    return NextResponse.json({ error: "Section required — pick a section for every table" }, { status: 400 });
  }

  const sec = await prisma.tableSection.findFirst({
    where: { id: tableSectionId, restaurantId },
  });
  if (!sec) {
    return NextResponse.json({ error: "Section not found" }, { status: 400 });
  }

  const maxOrder = await prisma.table
    .aggregate({
      where: { tableSectionId },
      _max: { sortOrder: true },
    })
    .then((r) => (r._max.sortOrder ?? -1) + 1);

  let token = typeof body.token === "string" ? body.token.trim().replace(/[^a-z0-9-]/gi, "").slice(0, 60) : "";
  if (!token) token = slugToken(name);
  const existing = await prisma.table.findUnique({ where: { token } });
  if (existing) {
    token = slugToken(name);
  }

  const table = await prisma.table.create({
    data: { restaurantId, name, token, tableSectionId, sortOrder: maxOrder },
  });
  return NextResponse.json(table);
}
