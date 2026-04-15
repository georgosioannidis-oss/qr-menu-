import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireOwnerApi } from "@/lib/require-owner-api";

/**
 * POST — generate a new print-agent token (invalidates any previous token).
 * DELETE — revoke token (disables the print API for this restaurant).
 */
export async function POST() {
  const session = await getDashboardServerSession();
  const forbidden = await requireOwnerApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const token = randomBytes(32).toString("hex");

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { printAgentToken: token },
  });

  revalidatePath("/dashboard", "layout");

  return NextResponse.json({
    token,
    hint: "Copy this value now. It is not shown again. Use it in PRINT_AGENT_TOKEN on the kitchen PC.",
  });
}

export async function DELETE() {
  const session = await getDashboardServerSession();
  const forbidden = await requireOwnerApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { printAgentToken: null },
  });

  revalidatePath("/dashboard", "layout");

  return NextResponse.json({ ok: true });
}
