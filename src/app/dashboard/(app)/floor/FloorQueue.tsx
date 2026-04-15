"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

type OrderItem = {
  quantity: number;
  unitPrice: number;
  notes: string | null;
  selectedOptionsSummary: string | null;
  menuItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  table: { name: string; token: string };
  items: OrderItem[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function FloorQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/dashboard/orders/incoming", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        setOrders([]);
        return;
      }
      if (res.status === 403) {
        setError("This account cannot open the floor queue.");
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as Order[];
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Check your network and database, then refresh.");
      } else {
        setError("Could not load incoming orders.");
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  const sendToKitchen = async (orderId: string) => {
    setSendingId(orderId);
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relayToKitchen: true }),
      });
      const text = await res.text();
      let d: { error?: string } = {};
      try {
        if (text) d = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        toast.error(d.error ?? "Could not send to kitchen");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      void load();
    } catch {
      toast.error("Request failed");
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading incoming orders…
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
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
        <p className="font-medium text-ink">No orders waiting on the floor</p>
        <p className="mt-2 text-sm text-ink-muted">
          When guests place orders, they appear here first. Tap <strong>Send to kitchen</strong> so the
          kitchen can start preparing.
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          If this stays empty for new orders, turn on <strong>Wait staff relay</strong> under{" "}
          <strong>Options</strong> (owner account).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const canSend = order.status === "paid" || order.status === "pending";
        return (
          <div
            key={order.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-primary/10"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-ink">{order.table.name}</span>
                <span className="ml-2 text-sm text-ink-muted">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    order.status === "pending"
                      ? "bg-amber-100 text-amber-950 group-data-[theme=dark]/dashboard:bg-amber-500/25 group-data-[theme=dark]/dashboard:text-amber-100"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {order.status === "pending" ? "Awaiting payment" : order.status}
                </span>
                <span className="text-lg font-bold tabular-nums text-ink">
                  {formatPrice(order.totalAmount)}
                </span>
                <button
                  type="button"
                  disabled={!canSend || sendingId === order.id}
                  title={
                    !canSend
                      ? "Only pending or paid orders can be sent (e.g. wait for card payment)."
                      : undefined
                  }
                  onClick={() => sendToKitchen(order.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingId === order.id ? (
                    <>
                      <Spinner className="h-4 w-4 border-white border-t-transparent" />
                      Sending…
                    </>
                  ) : (
                    "Send to kitchen"
                  )}
                </button>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {order.items.map((line, i) => {
                const extra = [line.notes, line.selectedOptionsSummary].filter(Boolean).join(" · ");
                return (
                  <li
                    key={i}
                    className="flex justify-between gap-2 border-b border-border/60 py-1.5 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-ink">
                        {line.quantity}× {line.menuItem.name}
                      </span>
                      {extra && (
                        <span className="mt-0.5 block text-xs text-ink-muted">{extra}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-medium tabular-nums text-ink">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
