/**
 * Human-readable copy for dashboard access types (`RestaurantUser.role`).
 * Kept in one place so Team accounts, invites, and join pages stay consistent.
 */

import { OWNER_ROLE, STAFF_GRANULAR_ROLE } from "@/lib/dashboard-roles";
import {
  DASHBOARD_SECTION_IDS,
  SECTION_LABELS,
  parseStaffPermissions,
  staffPermissionsHasAny,
} from "@/lib/staff-permissions";

/** Invite list / team table — includes granular `staff` when `permissions` is set. */
export function teamAccessSummary(role: string, permissions?: unknown): string {
  if (role === OWNER_ROLE) {
    return "Owner (full control)";
  }
  if (role === STAFF_GRANULAR_ROLE) {
    const p = parseStaffPermissions(permissions);
    if (!p || !staffPermissionsHasAny(p)) return "Custom access (no areas)";
    const parts = DASHBOARD_SECTION_IDS.filter((k) => p[k]).map((k) => SECTION_LABELS[k]);
    return parts.join(" · ");
  }
  return accessTypeCompactSummary(role);
}

export function accessTypeDropdownLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner — full control (Office, menu, team)";
    case "waiter":
      return "Waiter — tables, orders & relay";
    case "kitchen":
      return "Prep — make / fulfill orders only (email)";
    case "floor":
      return "All-rounder — waiter + prep screens";
    case "staff":
      return "Custom — owner picked which dashboard areas apply.";
    default:
      return `Current access (${role})`;
  }
}

export function accessTypeHelpText(role: string): string {
  switch (role) {
    case "owner":
      return "Sign in on the Owner tab. Can use Office, Options, menu, tables, and manage team access.";
    case "waiter":
      return "Sign in on the Team tab. Opens table orders and relays guest orders to prep — no cooking/prep list.";
    case "kitchen":
      return "Sign in on the Team tab. Sees orders to make or pour; does not take new orders from guests. (The venue tablet uses a separate “device” login.)";
    case "floor":
      return "Sign in on the Team tab. Can use both the waiter screen and the prep / active-orders screen.";
    case "staff":
      return "Sign in on the Team tab. Access matches the areas your owner enabled for this account.";
    default:
      return "This account uses a legacy access type. Change it to a standard option if you are unsure.";
  }
}

/** One line for invite lists, history, join page. */
export function accessTypeCompactSummary(role: string): string {
  switch (role) {
    case "owner":
      return "Owner (full control)";
    case "waiter":
      return "Waiter (tables & relay)";
    case "kitchen":
      return "Prep (fulfill orders only)";
    case "floor":
      return "All-rounder (guests + prep)";
    case "staff":
      return "Custom (picked areas)";
    default:
      return "Custom access";
  }
}

/** Alias for invite/join copy — kept separate from `dashboard-roles` to avoid bundler init issues. */
export const staffCapabilitySummary = accessTypeCompactSummary;

export function venueDeviceAccessHelp(): string {
  return "Kitchen accounts use the Team tab with their own email. Legacy auto-created device rows can be removed in Office.";
}
