import {
  FLOOR_ROLE,
  KITCHEN_ROLE,
  STAFF_GRANULAR_ROLE,
  WAITER_ROLE,
} from "@/lib/dashboard-roles";

export function isStaffOnlyRole(role: string): boolean {
  return (
    role === KITCHEN_ROLE ||
    role === WAITER_ROLE ||
    role === FLOOR_ROLE ||
    role === STAFF_GRANULAR_ROLE
  );
}

/** Accounts that count as “owner-side” for at-least-one rules (not kitchen/waiter). */
export function isOwnerCapableRole(role: string): boolean {
  return !isStaffOnlyRole(role);
}
