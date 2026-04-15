import { hash, compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getDashboardServerSession } from "@/lib/auth-server";
import { isKitchenDeviceEmail } from "@/lib/kitchen-device-user";
import { prisma } from "@/lib/prisma";

/**
 * Update the signed-in dashboard user’s email and/or password (current password required).
 */
export async function PATCH(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const restaurantId = session?.user?.restaurantId;
  if (!userId || !restaurantId || !session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newEmail?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }

  const user = await prisma.restaurantUser.findFirst({
    where: { id: userId, restaurantId },
  });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (user.disabled) {
    return NextResponse.json({ error: "This account is disabled." }, { status: 403 });
  }

  if (!(await compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const emailChangedRequested = newEmailRaw.length > 0 && newEmailRaw !== user.email.toLowerCase();
  const passwordChangedRequested = newPassword.length > 0;

  if (!emailChangedRequested && !passwordChangedRequested) {
    return NextResponse.json(
      { error: "Enter a new email or a new password to save changes." },
      { status: 400 }
    );
  }

  if (emailChangedRequested) {
    if (isKitchenDeviceEmail(user.email)) {
      return NextResponse.json(
        { error: "This legacy system account cannot change its email. Remove it in Office if unused." },
        { status: 400 }
      );
    }
    if (!newEmailRaw.includes("@") || newEmailRaw.length > 255) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
  }

  if (passwordChangedRequested && newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const data: { email?: string; passwordHash?: string } = {};
  if (emailChangedRequested) data.email = newEmailRaw;
  if (passwordChangedRequested) data.passwordHash = await hash(newPassword, 10);

  try {
    const updated = await prisma.restaurantUser.update({
      where: { id: userId },
      data,
      select: { email: true, firstName: true, lastName: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That email is already in use. Choose a different one." },
        { status: 400 }
      );
    }
    throw e;
  }
}
