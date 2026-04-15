import { GuestOrderingPauseCard } from "./GuestOrderingPauseCard";
import { OrdersList } from "./OrdersList";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Orders</h1>
        <p className="text-ink-muted">Active orders and recent history. The list below refreshes on a short interval.</p>
      </div>
      <GuestOrderingPauseCard />
      <OrdersList />
    </div>
  );
}
