import type { Prisma } from "@prisma/client";

/**
 * Orders visible on the kitchen “current” list: active pipeline and either past wait-staff relay
 * or direct-to-kitchen (waiterRelayEnabled false → waiterRelayAt set at creation).
 */
export function ordersInKitchenQueueWhere(restaurantId: string): Prisma.OrderWhereInput {
  return {
    restaurantId,
    status: { notIn: ["delivered", "declined"] },
    OR: [{ restaurant: { waiterRelayEnabled: false } }, { waiterRelayAt: { not: null } }],
  };
}
