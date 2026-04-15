import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireManagementApi, requireOwnerApi } from "@/lib/require-owner-api";
import { OWNER_ROLE, STAFF_GRANULAR_ROLE } from "@/lib/dashboard-roles";
import { staffJoinUrlFromRequest } from "@/lib/staff-invite-url";
import {
  emptyStaffPermissions,
  normalizeInvitePermissions,
  staffPermissionsHasAny,
} from "@/lib/staff-permissions";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireManagementApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;

  const invites = await prisma.staffInvite.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      token: true,
      role: true,
      permissions: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      usedByEmail: true,
    },
  });

  const now = new Date();
  return NextResponse.json({
    invites: invites.map((i) => {
      const invitePageUrl = staffJoinUrlFromRequest(req, i.token);
      return {
        id: i.id,
        role: i.role,
        permissions: i.permissions,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString() ?? null,
        usedByEmail: i.usedByEmail ?? null,
        invitePageUrl,
        joinUrl: !i.usedAt && i.expiresAt > now ? invitePageUrl : null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  const forbiddenMgmt = await requireManagementApi(session);
  if (forbiddenMgmt) return forbiddenMgmt;

  let grantOwnerAccess = false;
  let preset: string | undefined;
  let rawBody: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) {
      rawBody = JSON.parse(text) as Record<string, unknown>;
      grantOwnerAccess = rawBody.grantOwnerAccess === true;
      preset = typeof rawBody.preset === "string" ? rawBody.preset : undefined;
    }
  } catch {
    /* ignore */
  }

  if (grantOwnerAccess) {
    const forbiddenOwner = await requireOwnerApi(session);
    if (forbiddenOwner) return forbiddenOwner;
  }

  let role: string;
  let permissions: unknown = null;

  if (grantOwnerAccess) {
    role = OWNER_ROLE;
  } else if (preset === "custom" || rawBody.permissions !== undefined) {
    const parsed = normalizeInvitePermissions(rawBody);
    if (!parsed || !staffPermissionsHasAny(parsed)) {
      return NextResponse.json(
        { error: "Select at least one area, or choose full owner access." },
        { status: 400 }
      );
    }
    role = STAFF_GRANULAR_ROLE;
    permissions = parsed;
  } else {
    return NextResponse.json(
      { error: "Use custom permissions or grant full owner access." },
      { status: 400 }
    );
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.staffInvite.create({
    data: {
      token,
      restaurantId: session!.user.restaurantId!,
      role,
      ...(role === STAFF_GRANULAR_ROLE
        ? { permissions: permissions as Prisma.InputJsonValue }
        : {}),
      expiresAt,
    },
  });

  revalidatePath("/dashboard/office");

  return NextResponse.json({
    joinUrl: staffJoinUrlFromRequest(req, token),
    expiresAt: expiresAt.toISOString(),
    role,
    permissions,
  });
}
