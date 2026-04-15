"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KitchenTicketPrintHint } from "@/components/KitchenTicketPrintHint";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

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
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function WaitStaffQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"accept" | "decline" | null>(null);

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
        setError("This account cannot open the wait staff queue.");
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

  const patchOrder = async (
    orderId: string,
    body: { relayToKitchen?: boolean; declineIncoming?: boolean },
    errFallback: string
  ) => {
    setActingId(orderId);
    setActionKind(body.relayToKitchen ? "accept" : "decline");
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let d: { error?: string } = {};
      try {
        if (text) d = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        toast.error(d.error ?? errFallback);
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      void load();
    } catch {
      toast.error("Request failed");
    } finally {
      setActingId(null);
      setActionKind(null);
    }
  };

  const acceptOrder = (orderId: string) =>
    patchOrder(orderId, { relayToKitchen: true }, "Could not accept order");

  const declineOrder = (orderId: string) => {
    if (
      !confirmDestructiveAction(
        "Decline this order?",
        "The guest will see that it was not accepted."
      )
    )
      return;
    patchOrder(orderId, { declineIncoming: true }, "Could not decline order");
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
        <p className="font-medium text-ink">No orders waiting for you</p>
        <p className="mt-2 text-sm text-ink-muted">
          When guests order, they show up here first. Tap <strong>Accept</strong> to send them to the kitchen, or{" "}
          <strong>Decline</strong> if you cannot take the order.
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          If new orders skip this screen and go straight to the kitchen, open <strong>Options</strong> and turn on{" "}
          <strong>Send new orders to wait staff first</strong>, then save.
        </p>
        <div className="mt-6 text-left">
          <KitchenTicketPrintHint />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KitchenTicketPrintHint />
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
                      ? "bg-amber-100 text-amber-950 ring-1 ring-amber-700/40"
                      : "bg-primary/20 text-ink ring-1 ring-primary/25"
                  }`}
                >
                  {order.status === "pending" ? "Awaiting payment" : order.status}
                </span>
                <span className="text-lg font-bold tabular-nums text-ink">
                  {formatPrice(order.totalAmount)}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!canSend || actingId === order.id}
                    title={
                      !canSend
                        ? "Only pending or paid orders can be accepted (e.g. wait for card payment)."
                        : undefined
                    }
                    onClick={() => acceptOrder(order.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actingId === order.id && actionKind === "accept" ? (
                      <>
                        <Spinner className="h-4 w-4 border-white border-t-transparent" />
                        Accepting…
                      </>
                    ) : (
                      "Accept"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!canSend || actingId === order.id}
                    title={
                      !canSend
                        ? "Only pending or paid orders can be declined."
                        : "Guest will be notified the order was not accepted."
                    }
                    onClick={() => declineOrder(order.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actingId === order.id && actionKind === "decline" ? (
                      <>
                        <Spinner className="h-4 w-4 border-primary border-t-transparent" />
                        Declining…
                      </>
                    ) : (
                      "Decline"
                    )}
                  </button>
                  <Link
                    href={`/dashboard/orders/print/${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Opens a printable kitchen slip in a new tab (browser print or PDF)"
                    className="rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface inline-flex items-center min-h-[44px]"
                  >
                    Print ticket
                  </Link>
                </div>
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
