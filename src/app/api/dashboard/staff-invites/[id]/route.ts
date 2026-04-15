import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireManagementApi } from "@/lib/require-owner-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireManagementApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const { id } = await params;

  const invite = await prisma.staffInvite.findFirst({
    where: { id, restaurantId },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json(
      { error: "This invite was already used and cannot be revoked." },
      { status: 400 }
    );
  }

  await prisma.staffInvite.delete({ where: { id } });

  revalidatePath("/dashboard/office");

  return NextResponse.json({ ok: true });
}
