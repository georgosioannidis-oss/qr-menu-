import { prisma } from "@/lib/prisma";

export type PrintAgentRestaurant = {
  id: string;
  name: string;
  waiterRelayEnabled: boolean;
};

/**
 * Authenticates `Authorization: Bearer <printAgentToken>` against Restaurant.printAgentToken.
 */
export async function restaurantForPrintAgentBearer(
  authHeader: string | null
): Promise<PrintAgentRestaurant | null> {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const restaurant = await prisma.restaurant.findUnique({
    where: { printAgentToken: token },
    select: { id: true, name: true, waiterRelayEnabled: true },
  });

  return restaurant;
}
