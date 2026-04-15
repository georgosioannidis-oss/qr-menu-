import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatusView } from "./OrderStatusView";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; orderId: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token, orderId } = await params;
  const { paid } = await searchParams;

  const order = await prisma.order.findFirst({
    where: { id: orderId, table: { token } },
    include: {
      table: { select: { name: true } },
      restaurant: { select: { name: true, logoUrl: true } },
    },
  });

  if (!order) notFound();

  return (
    <OrderStatusView
      orderId={order.id}
      tableToken={token}
      tableName={order.table.name}
      restaurantName={order.restaurant.name}
      restaurantLogoUrl={order.restaurant.logoUrl ?? undefined}
      paidSuccess={paid === "1"}
    />
  );
}
