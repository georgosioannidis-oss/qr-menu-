import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { isDatabaseConnectionError } from "@/lib/database-connection-error";
import { ensureRestaurantTablesHaveSections } from "@/lib/ensure-tables-in-sections";
import { prisma } from "@/lib/prisma";
import { requireWaitStaffApiAccess } from "@/lib/require-wait-staff-api";

/**
 * GET /api/dashboard/wait-staff/tables
 * Sections + tables (name, token) for the waiter screen — no menu/tables edit permission required.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getDashboardServerSession(req);
    const forbidden = await requireWaitStaffApiAccess(session);
    if (forbidden) return forbidden;
    const restaurantId = session!.user.restaurantId!;

    await ensureRestaurantTablesHaveSections(restaurantId);

    const sections = await prisma.tableSection.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: "asc" },
      include: {
        tables: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, token: true, sortOrder: true, waiterCalledAt: true },
        },
      },
    });

    return NextResponse.json({ sections });
  } catch (e) {
    console.error("GET /api/dashboard/wait-staff/tables:", e);
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
