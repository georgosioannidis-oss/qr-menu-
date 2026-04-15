/** Stored on `RestaurantUser.role`. Internal keys — use `title` on the user for display names. */
export const OWNER_ROLE = "owner";
/** Prep / orders queue (email sign-in on Team tab). */
export const KITCHEN_ROLE = "kitchen";
/** Waiter / guest-order relay (email login). */
export const WAITER_ROLE = "waiter";
/** Both prep queue and guest-order screens (email login). */
export const FLOOR_ROLE = "floor";
/** Team-tab login with per-section permissions (`RestaurantUser.permissions` JSON). */
export const STAFF_GRANULAR_ROLE = "staff";

/** Shared expo / kitchen device account only — not `floor`. */
export function isPureKitchenRole(role: string | undefined | null): boolean {
  return role === KITCHEN_ROLE;
}

export function hasKitchenQueueAccess(role: string | undefined | null): boolean {
  return role === KITCHEN_ROLE || role === FLOOR_ROLE;
}

export function hasWaitStaffAccess(role: string | undefined | null): boolean {
  return role === WAITER_ROLE || role === FLOOR_ROLE;
}

/**
 * Full dashboard (Office, Options, Overview): anyone who is not exclusively staff buckets.
 * Unknown / legacy roles count as owner-capable. Granular `staff` is never an “owner role” here.
 */
export function isOwnerRole(role: string | undefined | null): boolean {
  if (role === STAFF_GRANULAR_ROLE) return false;
  return !hasKitchenQueueAccess(role) && !hasWaitStaffAccess(role);
}

/** Staff who may sign in with email on the “Team” tab. */
export function isEmailStaffRole(role: string | undefined | null): boolean {
  return (
    role === WAITER_ROLE ||
    role === FLOOR_ROLE ||
    role === KITCHEN_ROLE ||
    role === STAFF_GRANULAR_ROLE
  );
}

/** Send-to-kitchen from guest-order flow: not pure kitchen-only. */
export function canRelayOrderToKitchen(role: string | undefined | null): boolean {
  if (isPureKitchenRole(role)) return false;
  return isOwnerRole(role) || hasWaitStaffAccess(role);
}

/** Revenue / stats: orders that count as real sales (not unpaid checkout abandoned). */
export const CONFIRMED_ORDER_STATUSES = ["paid", "preparing", "ready", "delivered"] as const;

export function isStaffInviteRole(role: string): boolean {
  return (
    role === KITCHEN_ROLE ||
    role === WAITER_ROLE ||
    role === FLOOR_ROLE ||
    role === STAFF_GRANULAR_ROLE ||
    role === OWNER_ROLE
  );
}

