/**
 * Customer `/m/[token]` data loaders. Uses React `cache()` so layout + page can share
 * one Prisma round-trip on the menu index route (middleware sets {@link CUSTOMER_PATHNAME_HEADER}).
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Internal request header: actual pathname, set by middleware (overwrites any client value). */
export const CUSTOMER_PATHNAME_HEADER = "x-customer-pathname";

const menuInclude = {
  restaurant: {
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      colorMode: true,
      onlinePaymentEnabled: true,
      payAtTableCardEnabled: true,
      payAtTableCashEnabled: true,
      guestQrOrderingPaused: true,
      menuCategories: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" as const },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
  },
} as const;

/** True when the URL is the table menu root `/m/{token}` (not order status, etc.). */
export function isCustomerMenuIndexPath(pathname: string): boolean {
  const norm = pathname.replace(/\/+$/, "") || "/";
  return /^\/m\/[^/]+$/.test(norm);
}

/** Full table + menu tree; deduped per request when layout and page both call it. */
export const loadCustomerTableWithMenuByToken = cache(async (token: string) => {
  return prisma.table.findUnique({
    where: { token },
    include: menuInclude,
  });
});

/** Light row for theme only; used on `/m/.../order/...` and as fallback when pathname is unknown. */
export const loadCustomerTableBrandingByToken = cache(async (token: string) => {
  return prisma.table.findUnique({
    where: { token },
    select: {
      restaurantId: true,
      restaurant: { select: { primaryColor: true, colorMode: true } },
    },
  });
});
