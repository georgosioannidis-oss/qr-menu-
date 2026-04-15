import { redirect } from "next/navigation";
import { getDashboardServerSession } from "@/lib/auth-server";
import { isPureKitchenRole } from "@/lib/dashboard-roles";
import { FloorQueue } from "./FloorQueue";

export default async function FloorPage() {
  const session = await getDashboardServerSession();
  if (!session?.user?.restaurantId) redirect("/dashboard/login");
  if (isPureKitchenRole(session.user.role)) redirect("/dashboard/orders");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Floor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Accept incoming orders and send them to the kitchen. The kitchen only sees orders after you tap{" "}
          <strong>Send to kitchen</strong> (when wait staff relay is on in Options).
        </p>
      </div>
      <FloorQueue />
    </div>
  );
}
