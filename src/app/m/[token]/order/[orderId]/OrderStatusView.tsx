"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";

type StatusCopyRow = { title: string; message: string; icon: string };

const STATUS_COPY: Record<string, StatusCopyRow> = {
  pending: {
    title: "Order received",
    message: "Complete payment to confirm. You can pay at the table or online.",
    icon: "⏳",
  },
  paid: {
    title: "Order accepted",
    message: "The kitchen has your order and will start preparing it shortly.",
    icon: "✓",
  },
  preparing: {
    title: "Preparing your order",
    message: "The kitchen is making your food. We’ll notify you when it’s ready.",
    icon: "👨‍🍳",
  },
  ready: {
    title: "Ready for pickup",
    message: "Your order is ready! Your server will bring it to your table shortly.",
    icon: "🔔",
  },
  delivered: {
    title: "Delivered",
    message: "Your order has been brought to your table. Enjoy your meal!",
    icon: "✓",
  },
  declined: {
    title: "Order declined",
    message:
      "The restaurant could not take this order. If you already paid online, contact the staff or check your payment provider.",
    icon: "—",
  },
};

function prepCountdownMessage(
  status: string,
  orderCreatedAtIso: string | null,
  prepMinutes: number | null,
  nowMs: number
): string | null {
  if (
    prepMinutes == null ||
    prepMinutes < 1 ||
    !orderCreatedAtIso ||
    (status !== "paid" && status !== "preparing")
  ) {
    return null;
  }
  const start = new Date(orderCreatedAtIso).getTime();
  if (!Number.isFinite(start)) return null;
  const target = start + prepMinutes * 60_000;
  const remainingMs = target - nowMs;
  if (remainingMs <= 0) {
    return "Your order should be ready soon (estimate).";
  }
  const minsLeft = Math.max(1, Math.ceil(remainingMs / 60_000));
  return minsLeft === 1
    ? "About 1 minute remaining (estimate)."
    : `About ${minsLeft} minutes remaining (estimate).`;
}

export function OrderStatusView({
  orderId,
  tableToken,
  tableName,
  restaurantName,
  restaurantLogoUrl,
  paidSuccess = false,
}: {
  orderId: string;
  tableToken: string;
  tableName: string;
  restaurantName: string;
  restaurantLogoUrl?: string;
  paidSuccess?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [orderCreatedAt, setOrderCreatedAt] = useState<string | null>(null);
  const [prepTimeEstimateMinutes, setPrepTimeEstimateMinutes] = useState<number | null>(null);
  const [prepTimeQuickOrder, setPrepTimeQuickOrder] = useState(false);
  const [waiterRelayPending, setWaiterRelayPending] = useState(false);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const statusCopy = useMemo(() => {
    if (waiterRelayPending) {
      return {
        title: "Waiting for staff",
        message:
          "Your order was received. A team member still needs to confirm it and send it to the kitchen. This page updates automatically.",
        icon: "🙋",
      };
    }
    const s = status ?? "pending";
    return STATUS_COPY[s] ?? STATUS_COPY.pending;
  }, [status, waiterRelayPending]);

  const prepEtaLine = useMemo(() => {
    if (waiterRelayPending) return null;
    const s = status ?? "pending";
    return prepCountdownMessage(s, orderCreatedAt, prepTimeEstimateMinutes, Date.now());
  }, [status, orderCreatedAt, prepTimeEstimateMinutes, tick, waiterRelayPending]);

  const prepQuickLine = useMemo(() => {
    if (waiterRelayPending) return null;
    const s = status ?? "pending";
    if (!prepTimeQuickOrder || (s !== "paid" && s !== "preparing")) return null;
    return "Simple orders like drinks are usually brought out very soon.";
  }, [status, prepTimeQuickOrder, waiterRelayPending]);

  /** Class names matched by injected CSS in `m/[token]/layout.tsx` (per data-theme) so color never ends up white-on-white. */
  const statusIconClass = useMemo(() => {
    if (waiterRelayPending) return "order-status-icon--pending";
    const s = status ?? "pending";
    const map: Record<string, string> = {
      pending: "order-status-icon--pending",
      paid: "order-status-icon--paid",
      preparing: "order-status-icon--preparing",
      ready: "order-status-icon--ready",
      delivered: "order-status-icon--delivered",
      declined: "order-status-icon--declined",
    };
    return map[s] ?? map.pending;
  }, [status, waiterRelayPending]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/${orderId}/status?tableToken=${encodeURIComponent(tableToken)}`
      );
      if (res.status === 404) {
        setError(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        status?: string;
        orderCreatedAt?: string;
        prepTimeEstimateMinutes?: number | null;
        prepTimeQuickOrder?: boolean;
        waiterRelayPending?: boolean;
      };
      if (typeof data.status === "string") setStatus(data.status);
      if (typeof data.orderCreatedAt === "string") setOrderCreatedAt(data.orderCreatedAt);
      const pm = data.prepTimeEstimateMinutes;
      setPrepTimeEstimateMinutes(typeof pm === "number" && pm > 0 ? pm : null);
      setPrepTimeQuickOrder(data.prepTimeQuickOrder === true);
      setWaiterRelayPending(data.waiterRelayPending === true);
    } catch {
      setError(true);
    }
  }, [orderId, tableToken]);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    const s = status;
    if (
      waiterRelayPending ||
      prepTimeEstimateMinutes == null ||
      !orderCreatedAt ||
      (s !== "paid" && s !== "preparing")
    ) {
      return;
    }
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, [status, prepTimeEstimateMinutes, orderCreatedAt, waiterRelayPending]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-sm w-full text-center bg-card rounded-3xl shadow-lg border border-border p-8">
          <p className="text-ink-muted font-medium">Order not found.</p>
          <Link
            href={`/m/${tableToken}`}
            className="mt-4 inline-block min-h-[44px] leading-[44px] text-primary font-semibold hover:underline"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  const displayStatus = waiterRelayPending ? "waiting for staff" : (status ?? "pending");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      <div className="max-w-sm w-full text-center bg-card rounded-3xl shadow-lg border border-border p-8">
        {paidSuccess && (
          <p className="mb-4 rounded-xl border border-border bg-primary/[0.06] px-3 py-2 text-sm text-ink">
            {waiterRelayPending
              ? "Payment received. A staff member still needs to confirm your order."
              : "Payment successful. Your order was sent."}
          </p>
        )}
        {restaurantLogoUrl && (
          <img
            src={restaurantLogoUrl}
            alt=""
            className="h-10 w-auto mx-auto mb-3 object-contain"
          />
        )}
        <p className="text-sm text-ink-muted mb-1">
          {restaurantName} · {tableName}
        </p>
        {status != null ? (
          <>
            <div
              className={`order-status-icon w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 ${statusIconClass}`}
            >
              {statusCopy.icon}
            </div>
            <h1 className="order-status-heading text-xl font-bold text-ink mb-2">{statusCopy.title}</h1>
            <p className="order-status-message text-ink-muted mb-6">{statusCopy.message}</p>
            {prepQuickLine ? (
              <p className="order-status-eta -mt-2 mb-6 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm font-medium text-ink">
                {prepQuickLine}
              </p>
            ) : prepEtaLine ? (
              <div className="order-status-eta -mt-2 mb-6 space-y-1.5 text-left">
                <p className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm font-medium text-ink">
                  {prepEtaLine}
                </p>
                <p className="text-xs leading-relaxed text-ink-muted px-0.5">
                  Rough guide for meals being prepared. Drinks and other simple items are often much quicker.
                </p>
              </div>
            ) : null}
            <p className="order-status-label text-xs font-semibold text-ink uppercase tracking-wide mb-6">
              Status: {displayStatus}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center text-2xl mx-auto mb-4 animate-pulse">
              …
            </div>
            <p className="text-ink-muted">Loading order status…</p>
          </>
        )}
        <Link
          href={`/m/${tableToken}`}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-center shadow-sm ring-1 ring-black/10"
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
