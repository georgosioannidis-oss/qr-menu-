import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/customer/waiter-call
 * Body: { tableToken: string }. Guest taps “Call waiter” on the menu.
 */
export async function POST(req: NextRequest) {
  let body: { tableToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body.tableToken === "string" ? body.tableToken.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "tableToken required" }, { status: 400 });
  }

  const table = await prisma.table.findFirst({
    where: { token },
    select: { id: true },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  await prisma.table.update({
    where: { id: table.id },
    data: { waiterCalledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
