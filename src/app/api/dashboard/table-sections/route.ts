import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { isDatabaseConnectionError } from "@/lib/database-connection-error";
import { prisma } from "@/lib/prisma";
import { ensureRestaurantTablesHaveSections } from "@/lib/ensure-tables-in-sections";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

export async function GET() {
  try {
    const session = await getDashboardServerSession();
    const forbidden = await requireMenuTablesApiAccess(session);
    if (forbidden) return forbidden;
    const restaurantId = session!.user.restaurantId!;

    await ensureRestaurantTablesHaveSections(restaurantId);

    const sections = await prisma.tableSection.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: "asc" },
      include: {
        tables: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ sections });
  } catch (e) {
    console.error("GET /api/dashboard/table-sections:", e);
    const message = e instanceof Error ? e.message : "Server error";
    let hint = "";
    if (
      message.includes("column") ||
      message.includes("sortOrder") ||
      /Unknown column|does not exist/i.test(message)
    ) {
      hint = " Run: npx prisma db push (from your project folder), then restart npm run dev.";
    } else if (isDatabaseConnectionError(e)) {
      hint =
        " Database unreachable. Check DATABASE_URL in .env, that Postgres is up, and try again.";
    }
    return NextResponse.json({ error: message + hint }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const maxOrder = await prisma.tableSection
      .aggregate({
        where: { restaurantId },
        _max: { sortOrder: true },
      })
      .then((r) => (r._max.sortOrder ?? -1) + 1);

    const section = await prisma.tableSection.create({
      data: {
        restaurantId,
        name,
        sortOrder: maxOrder,
      },
    });
    return NextResponse.json(section);
  } catch (e) {
    console.error("POST /api/dashboard/table-sections:", e);
    const message = e instanceof Error ? e.message : "Failed to create section";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
