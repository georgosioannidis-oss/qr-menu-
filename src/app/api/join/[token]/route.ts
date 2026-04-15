import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaffInviteRole, STAFF_GRANULAR_ROLE } from "@/lib/dashboard-roles";
import { emptyStaffPermissions, parseStaffPermissions } from "@/lib/staff-permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: raw } = await params;
  const token = raw?.trim().toLowerCase();
  if (!token) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  let body: { email?: string; password?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 }
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const now = new Date();

  const preview = await prisma.staffInvite.findUnique({ where: { token } });
  if (!preview) {
    return NextResponse.json(
      { error: "This link is not valid. Check you opened the full URL or ask for a new invite." },
      { status: 400 }
    );
  }
  if (preview.usedAt) {
    return NextResponse.json(
      { error: "This invite was already used. Ask your manager for a new link from Office." },
      { status: 400 }
    );
  }
  if (preview.expiresAt <= now) {
    return NextResponse.json(
      { error: "This invite has expired. Ask your manager for a new link." },
      { status: 400 }
    );
  }
  if (!isStaffInviteRole(preview.role)) {
    return NextResponse.json(
      { error: "This invite is invalid. Ask your manager to create a new one from Office." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.restaurantUser.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      {
        error:
          "This email already has an account. Sign in with the Team tab, or use a different email.",
      },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invite = await tx.staffInvite.findUnique({ where: { token } });
      if (
        !invite ||
        invite.usedAt ||
        invite.expiresAt <= now ||
        !isStaffInviteRole(invite.role)
      ) {
        throw new Error("INVITE_GONE");
      }

      const updated = await tx.staffInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: now, usedByEmail: email },
      });
      if (updated.count !== 1) {
        throw new Error("INVITE_GONE");
      }

      const passwordHash = await hash(password, 10);
      const staffPermsJson: Prisma.InputJsonValue | undefined =
        invite.role === STAFF_GRANULAR_ROLE
          ? ((parseStaffPermissions(invite.permissions) ?? emptyStaffPermissions()) as Prisma.InputJsonValue)
          : undefined;

      await tx.restaurantUser.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: invite.role,
          restaurantId: invite.restaurantId,
          disabled: false,
          ...(staffPermsJson !== undefined ? { permissions: staffPermsJson } : {}),
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_GONE") {
      return NextResponse.json(
        { error: "This invite is no longer valid. Ask for a new link." },
        { status: 400 }
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "This email is already registered. Sign in with the Team tab, or use a different email.",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/join:", e);
    return NextResponse.json(
      { error: "Could not create the account. Try again or ask for a new invite." },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard/office");

  return NextResponse.json({ message: "Account created. You can sign in." });
}
