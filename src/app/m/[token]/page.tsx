/**
 * Server page for `/m/[token]`: resolves the table by public token, loads menu tree, renders `MenuView`.
 * `token` is the `Table.token` column (what QR codes point at), not a session secret.
 */
import { notFound } from "next/navigation";
import { loadCustomerTableWithMenuByToken } from "@/lib/load-customer-table";
import { normalizePublicMediaUrl } from "@/lib/media-url";
import { restaurantUsesStripeCheckout } from "@/lib/restaurant-checkout";
import { MenuView } from "./MenuView";

export const revalidate = 30;

export default async function TableMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; cancel?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  const table = await loadCustomerTableWithMenuByToken(token);

  if (!table) notFound();

  const menu = table.restaurant.menuCategories.filter((c) => c.items.length > 0);
  const usesOnlineCheckout = restaurantUsesStripeCheckout(table.restaurant);

  return (
    <MenuView
        restaurantName={table.restaurant.name}
        tableName={table.name}
        tableToken={token}
        tableLogoUrl={table.restaurant.logoUrl ?? undefined}
        paidSuccess={paid === "1"}
        usesOnlineCheckout={usesOnlineCheckout}
        payAtTableCardEnabled={table.restaurant.payAtTableCardEnabled === true}
        payAtTableCashEnabled={table.restaurant.payAtTableCashEnabled === true}
        guestOrderingPaused={table.restaurant.guestQrOrderingPaused === true}
        categories={menu.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description ?? undefined,
          price: i.price,
          imageUrl: normalizePublicMediaUrl(i.imageUrl ?? undefined) ?? undefined,
          optionGroups: (() => {
            if (!i.optionGroups) return undefined;
            try {
              return typeof i.optionGroups === "string"
                ? JSON.parse(i.optionGroups)
                : i.optionGroups;
            } catch {
              return undefined;
            }
          })(),
        })),
      }))}
    />
  );
}
