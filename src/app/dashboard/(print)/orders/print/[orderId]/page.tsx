import { notFound, redirect } from "next/navigation";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { hasKitchenQueueAccess, hasWaitStaffAccess } from "@/lib/dashboard-roles";
import type { PrintOrderPayload } from "./PrintOrderTicket";
import { PrintOrderTicket } from "./PrintOrderTicket";

export const dynamic = "force-dynamic";

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await getDashboardServerSession();
  if (!session?.user?.restaurantId) {
    redirect("/dashboard/login");
  }

  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: session.user.restaurantId },
    include: {
      table: { select: { name: true } },
      restaurant: { select: { name: true } },
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  let paymentSummary: string | null = null;
  if (order.paymentPreference === "card") paymentSummary = "Card at table";
  else if (order.paymentPreference === "cash") paymentSummary = "Cash";
  else if (order.stripeSessionId) paymentSummary = "Online card";

  const payload: PrintOrderPayload = {
    id: order.id,
    restaurantName: order.restaurant.name,
    tableName: order.table.name,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    totalAmount: order.totalAmount,
    paymentSummary,
    billPaidAt: order.billPaidAt?.toISOString() ?? null,
    items: order.items.map((row) => ({
      quantity: row.quantity,
      name: row.menuItem.name,
      unitPrice: row.unitPrice,
      notes: row.notes,
      selectedOptionsSummary: row.selectedOptionsSummary,
    })),
  };

  const role = session.user.role;
  const k = hasKitchenQueueAccess(role);
  const w = hasWaitStaffAccess(role);
  const backHref =
    w && !k ? "/dashboard/wait-staff" : k && !w ? "/dashboard/orders" : "/dashboard/wait-staff";

  return <PrintOrderTicket order={payload} backHref={backHref} />;
}
