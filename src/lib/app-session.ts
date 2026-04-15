/**
 * Session shape for dashboard client code without importing `next-auth` in `"use client"` files.
 * Keeps the same fields as `Session` from `next-auth` (see `src/types/next-auth.d.ts`).
 */
export type AppDashboardSession = {
  expires?: string;
  dashboardAuthChannel?: "owner" | "staff";
  user?: {
    id?: string;
    email?: string | null;
    restaurantId?: string;
    restaurantName?: string;
    role?: string;
    permissions?: unknown;
    firstName?: string | null;
    lastName?: string | null;
  };
} | null;
