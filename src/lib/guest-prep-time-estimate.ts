/** Statuses that mean the ticket is still in the kitchen / service pipeline (guest-facing load). */
export const GUEST_LOAD_ORDER_STATUSES = ["paid", "preparing", "ready"] as const;

const MAX_EXTRA_MINUTES = 60;

/**
 * Adds time when other confirmed orders were placed before this one and when many tables have open tickets.
 * Heuristic only — not a promise of completion time.
 */
export function loadAdjustedPrepMinutes(
  baseMinutes: number,
  ordersAhead: number,
  activeTableCount: number
): number {
  if (baseMinutes < 1) return baseMinutes;
  const oh = Math.max(0, Math.floor(ordersAhead));
  const tables = Math.max(0, Math.floor(activeTableCount));
  const spread = Math.max(0, tables - 1);
  const extra = Math.min(MAX_EXTRA_MINUTES, Math.round(oh * 2 + spread * 1.5));
  return Math.min(300, baseMinutes + extra);
}
