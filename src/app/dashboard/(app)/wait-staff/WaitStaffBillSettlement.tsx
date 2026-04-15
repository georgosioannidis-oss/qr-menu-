"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

type Line = {
  id: string;
  quantity: number;
  unitPrice: number;
  billLinePaid: boolean;
  menuItem: { name: string };
};

type OpenBillOrder = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentPreference?: string | null;
  billPaidAt?: string | null;
  table: { name: string; token: string };
  items: Line[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function WaitStaffBillSettlement() {
  const [orders, setOrders] = useState<OpenBillOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLine, setBusyLine] = useState<{ orderId: string; lineId: string } | null>(null);
  const [busyAllOrderId, setBusyAllOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/wait-staff/open-bills");
      if (res.status === 401) {
        setError("Session expired. Sign in again.");
        setOrders([]);
        return;
      }
      if (res.status === 403) {
        setError("This account cannot open bills.");
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as OpenBillOrder[];
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load open bills.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const patchLine = async (orderId: string, orderItemId: string, billLinePaid: boolean) => {
    setBusyLine({ orderId, lineId: orderItemId });
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/bill-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, billLinePaid }),
      });
      const text = await res.text();
      let d: { error?: string } = {};
      try {
        if (text) d = JSON.parse(text);
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        toast.error(d.error ?? "Could not update line");
        return;
      }
      await load();
    } catch {
      toast.error("Request failed");
    } finally {
      setBusyLine(null);
    }
  };

  const markEntireBill = async (orderId: string) => {
    if (
      !confirmDestructiveAction(
        "Mark every line on this ticket as paid?",
        "This updates the bill so all items are treated as settled."
      )
    )
      return;
    setBusyAllOrderId(orderId);
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/bill-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllLinesPaid: true }),
      });
      const text = await res.text();
      let d: { error?: string } = {};
      try {
        if (text) d = JSON.parse(text);
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        toast.error(d.error ?? "Could not mark bill");
        return;
      }
      toast.success("Bill marked paid");
      await load();
    } catch {
      toast.error("Request failed");
    } finally {
      setBusyAllOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading open bills…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-ink shadow-sm">{error}</div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
        <p className="font-medium text-ink">No open bills to collect</p>
        <p className="mt-2 text-sm text-ink-muted">
          When guests place orders, tickets appear here until every line is checked off as paid at the table.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const linesDone = order.items.filter((i) => i.billLinePaid).length;
        const linesTotal = order.items.length;
        const isAllBusy = busyAllOrderId === order.id;
        return (
          <div
            key={order.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-primary/10 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="font-bold text-ink">{order.table.name}</span>
                <span className="ml-2 text-sm text-ink-muted">{formatWhen(order.createdAt)}</span>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Kitchen: {order.status} · Lines paid {linesDone}/{linesTotal}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold tabular-nums text-ink">{formatPrice(order.totalAmount)}</span>
                <button
                  type="button"
                  disabled={isAllBusy}
                  onClick={() => void markEntireBill(order.id)}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                >
                  {isAllBusy ? (
                    <>
                      <Spinner className="mr-2 h-3.5 w-3.5 border-white border-t-transparent" label="" />
                      Saving…
                    </>
                  ) : (
                    "Mark whole bill paid"
                  )}
                </button>
              </div>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface/40">
              {order.items.map((line) => (
                <li key={line.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={line.billLinePaid}
                      disabled={
                        isAllBusy ||
                        (busyLine?.orderId === order.id && busyLine?.lineId === line.id)
                      }
                      onChange={(e) => void patchLine(order.id, line.id, e.target.checked)}
                      className="h-5 w-5 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                    />
                    <span
                      className={`flex-1 text-sm ${line.billLinePaid ? "text-ink-muted line-through" : "font-medium text-ink"}`}
                    >
                      {line.quantity}× {line.menuItem.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              Check each line as you collect payment (card or cash). When all lines are checked, the ticket leaves this
              list. Use <strong>Mark whole bill paid</strong> for one payment covering the full ticket.
            </p>
          </div>
        );
      })}
    </div>
  );
}
