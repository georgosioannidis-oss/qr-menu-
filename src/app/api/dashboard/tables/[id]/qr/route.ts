import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireMenuTablesApiAccess } from "@/lib/menu-tables-access";

/**
 * GET /api/dashboard/tables/[id]/qr
 *
 * Returns a PNG image of a QR code that links to this table's menu.
 * Only the restaurant that owns the table can generate the QR.
 * The browser will typically download it as a file (Content-Disposition: attachment).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireMenuTablesApiAccess(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const { id: tableId } = await params;

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const menuUrl = `${baseUrl}/m/${table.token}`;

  const pngBuffer = await QRCode.toBuffer(menuUrl, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // NextResponse BodyInit typing excludes Node Buffer; copy bytes for a typed ArrayBuffer view.
  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${table.name.replace(/[^a-z0-9]/gi, "-")}.png"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
