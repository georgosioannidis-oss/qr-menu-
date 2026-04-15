import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireManagementApi, requireOwnerApi } from "@/lib/require-owner-api";
import {
  FLOOR_ROLE,
  KITCHEN_ROLE,
  OWNER_ROLE,
  STAFF_GRANULAR_ROLE,
  WAITER_ROLE,
} from "@/lib/dashboard-roles";
import { isKitchenDeviceEmail } from "@/lib/kitchen-device-user";
import { isOwnerCapableRole } from "@/lib/restaurant-user-policy";
import { parseStaffPermissions, staffPermissionsHasAny } from "@/lib/staff-permissions";

const ASSIGNABLE_ROLES = new Set<string>([
  OWNER_ROLE,
  KITCHEN_ROLE,
  WAITER_ROLE,
  FLOOR_ROLE,
  STAFF_GRANULAR_ROLE,
]);

const STAFF_ONLY_ROLES = [KITCHEN_ROLE, WAITER_ROLE, FLOOR_ROLE, STAFF_GRANULAR_ROLE] as const;

async function countEnabledOwnerCapable(restaurantId: string, excludeUserId: string) {
  return prisma.restaurantUser.count({
    where: {
      restaurantId,
      id: { not: excludeUserId },
      disabled: false,
      NOT: { role: { in: [...STAFF_ONLY_ROLES] } },
    },
  });
}

/** For delete: keep at least one owner-capable row (any disabled state). */
async function countOwnerCapableOthers(restaurantId: string, excludeUserId: string) {
  return prisma.restaurantUser.count({
    where: {
      restaurantId,
      id: { not: excludeUserId },
      NOT: { role: { in: [...STAFF_ONLY_ROLES] } },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireManagementApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;
  const ownerUserId = (session!.user as { id?: string }).id;

  const { id: targetId } = await params;

  let body: {
    disabled?: boolean;
    title?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    role?: string;
    permissions?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target = await prisma.restaurantUser.findFirst({
    where: { id: targetId, restaurantId },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: {
    disabled?: boolean;
    title?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    role?: string;
    permissions?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  } = {};

  if (body.role !== undefined) {
    const nextRole = String(body.role).trim();
    if (!ASSIGNABLE_ROLES.has(nextRole)) {
      return NextResponse.json({ error: "Invalid access type." }, { status: 400 });
    }
    if (isKitchenDeviceEmail(target.email) && nextRole !== KITCHEN_ROLE) {
      return NextResponse.json(
        {
          error:
            "The venue shared-device login must stay on prep / device access. Create another account for other roles.",
        },
        { status: 400 }
      );
    }
    if (nextRole !== target.role) {
      if (nextRole === OWNER_ROLE) {
        const fo = await requireOwnerApi(session);
        if (fo) return fo;
      }

      const becomingStaffOnly =
        nextRole === KITCHEN_ROLE ||
        nextRole === WAITER_ROLE ||
        nextRole === FLOOR_ROLE ||
        nextRole === STAFF_GRANULAR_ROLE;
      if (isOwnerCapableRole(target.role) && becomingStaffOnly) {
        const remaining = await countOwnerCapableOthers(restaurantId, targetId);
        if (remaining < 1) {
          return NextResponse.json(
            {
              error:
                "Add or keep another owner-capable account before moving this person to staff-only access.",
            },
            { status: 400 }
          );
        }
      }

      if (nextRole === STAFF_GRANULAR_ROLE) {
        const perms = parseStaffPermissions(body.permissions);
        if (!perms || !staffPermissionsHasAny(perms)) {
          return NextResponse.json(
            { error: "Pick at least one dashboard area for custom access." },
            { status: 400 }
          );
        }
        data.role = nextRole;
        data.permissions = perms as Prisma.InputJsonValue;
      } else {
        data.role = nextRole;
        data.permissions = Prisma.DbNull;
      }
    }
  }

  if (
    body.permissions !== undefined &&
    target.role === STAFF_GRANULAR_ROLE &&
    body.role === undefined
  ) {
    const perms = parseStaffPermissions(body.permissions);
    if (!perms || !staffPermissionsHasAny(perms)) {
      return NextResponse.json(
        { error: "Pick at least one dashboard area for custom access." },
        { status: 400 }
      );
    }
    data.permissions = perms as Prisma.InputJsonValue;
  }

  if (body.title !== undefined) {
    const raw = body.title;
    const t =
      raw === null || raw === ""
        ? null
        : String(raw).trim().slice(0, 80) || null;
    data.title = t;
  }

  const trimName = (raw: unknown) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const s = String(raw).trim().slice(0, 80);
    return s || null;
  };
  if (body.firstName !== undefined) {
    data.firstName = trimName(body.firstName);
  }
  if (body.lastName !== undefined) {
    data.lastName = trimName(body.lastName);
  }

  if (body.disabled !== undefined) {
    const nextDisabled = Boolean(body.disabled);
    if (nextDisabled && targetId === ownerUserId) {
      return NextResponse.json(
        { error: "You cannot disable your own account while signed in." },
        { status: 400 }
      );
    }
    if (nextDisabled && isOwnerCapableRole(target.role)) {
      const remaining = await countEnabledOwnerCapable(restaurantId, targetId);
      if (remaining < 1) {
        return NextResponse.json(
          { error: "Keep at least one active owner-capable account (not kitchen/wait staff only)." },
          { status: 400 }
        );
      }
    }
    data.disabled = nextDisabled;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const updated = await prisma.restaurantUser.update({
    where: { id: targetId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      disabled: true,
      title: true,
      permissions: true,
      createdAt: true,
    },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/office");

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardServerSession(req);
  const forbidden = await requireManagementApi(session);
  if (forbidden) return forbidden;
  const restaurantId = session!.user.restaurantId!;
  const ownerUserId = (session!.user as { id?: string }).id;

  const { id: targetId } = await params;

  if (targetId === ownerUserId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const target = await prisma.restaurantUser.findFirst({
    where: { id: targetId, restaurantId },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isOwnerCapableRole(target.role)) {
    const fo = await requireOwnerApi(session);
    if (fo) return fo;
    const remaining = await countOwnerCapableOthers(restaurantId, targetId);
    if (remaining < 1) {
      return NextResponse.json(
        { error: "You must keep at least one owner-capable account." },
        { status: 403 }
      );
    }
  }

  await prisma.restaurantUser.delete({ where: { id: targetId } });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/office");

  return NextResponse.json({ ok: true });
}
