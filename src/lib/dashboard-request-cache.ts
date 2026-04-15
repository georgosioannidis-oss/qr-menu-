import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Loaded once per React server request (deduped across layouts, session, pages). */
export const getCachedRestaurantUserDashboardRow = cache(async (userId: string) => {
  return prisma.restaurantUser.findUnique({
    where: { id: userId },
    select: {
      restaurantId: true,
      email: true,
      firstName: true,
      lastName: true,
      disabled: true,
      role: true,
      permissions: true,
    },
  });
});

/** Branding row for dashboard shell — deduped if multiple callers need it in one render. */
export const getCachedRestaurantBranding = cache(async (restaurantId: string) => {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      colorMode: true,
      staffMayEditMenuTables: true,
      navLabelOrdersQueue: true,
      navLabelGuestOrders: true,
    },
  });
});
