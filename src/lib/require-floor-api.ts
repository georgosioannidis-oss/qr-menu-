import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { isPureKitchenRole } from "./dashboard-roles";

/** Guest-order relay queue: not the prep-only role. */
export function requireFloorQueueApi(session: Session | null): NextResponse | null {
  const restaurantId = session?.user?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isPureKitchenRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
