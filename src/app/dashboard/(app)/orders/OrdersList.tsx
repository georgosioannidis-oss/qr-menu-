"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { KitchenTicketPrintHint } from "@/components/KitchenTicketPrintHint";
import { Spinner } from "@/components/ui/spinner";

type OrderItem = {
  quantity: number;
  unitPrice: number;
  notes: string | null;
  selectedOptionsSummary: string | null;
  menuItem: {
    name: string;
    stationId?: string | null;
    station?: { id: string; name: string } | null;
    category?: { stationId?: string | null; station?: { id: string; name: string } | null } | null;
  };
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentPreference?: string | null;
  stripeSessionId?: string | null;
  billPaidAt?: string | null;
  table: { name: string; token: string };
  items: OrderItem[];
};

function paymentSummary(order: Order): string | null {
  if (order.paymentPreference === "card") return "Pay: Card at table";
  if (order.paymentPreference === "cash") return "Pay: Cash";
  if (order.stripeSessionId) return "Pay: Online card";
  return null;
}

/** Guest payment or wait-staff “bill collected” — used to style the single Pay line. */
function isOrderPaymentSettled(order: Order): boolean {
  if (order.billPaidAt) return true;
  const s = order.status ?? "pending";
  return s === "paid" || s === "preparing" || s === "ready" || s === "delivered";
}

function payLineLabel(order: Order): string | null {
  const base = paymentSummary(order);
  if (base) return base;
  if (order.billPaidAt) return "Pay: Bill settled at table";
  return null;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function OrderStatusBadge({ status }: { status: string }) {
  /*
   * Always use dark text on light-tinted pills. Do not use Tailwind `dark:` (OS preference) on the
   * dashboard — use `group-data-[theme=dark]/dashboard:` on `.dashboard-theme-root` instead.
   */
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-950 ring-2 ring-yellow-700/55 group-data-[theme=dark]/dashboard:bg-yellow-950/35 group-data-[theme=dark]/dashboard:text-yellow-50 group-data-[theme=dark]/dashboard:ring-yellow-500/50",
    paid: "bg-primary/20 text-ink ring-1 ring-primary/30",
    preparing:
      "bg-amber-100 text-amber-950 ring-2 ring-amber-700/70 shadow-sm text-sm font-bold",
    ready:
      "bg-emerald-100 text-emerald-950 ring-2 ring-emerald-700/70 shadow-sm text-sm font-bold",
    delivered: "bg-violet-100 text-violet-950 ring-2 ring-violet-700/60",
    declined: "bg-red-100 text-red-950 ring-2 ring-red-700/60",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    preparing: "Preparing",
    ready: "Ready for pickup",
    delivered: "Delivered",
    declined: "Declined",
  };
  const style = styles[status] ?? "bg-surface text-ink-muted";
  const label = labels[status] ?? (status || "Pending");
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {label}
    </span>
  );
}

function OrderStatusActions({
  orderId,
  status,
  onUpdated,
}: {
  orderId: string;
  status: string;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        toast.error(d.error ?? "Failed to update");
        return;
      }
      onUpdated();
    } catch {
      toast.error("Request failed");
    } finally {
      setLoading(null);
    }
  };

  if (status === "delivered" || status === "declined") return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {(status === "pending" || status === "paid") && (
        <button
          type="button"
          onClick={() => updateStatus("preparing")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading === "preparing" ? (
            <>
              <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
              <span>Updating…</span>
            </>
          ) : (
            "Mark preparing"
          )}
        </button>
      )}
      {status === "preparing" && (
        <button
          type="button"
          onClick={() => updateStatus("ready")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "ready" ? (
            <>
              <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
              <span>Updating…</span>
            </>
          ) : (
            "Mark ready"
          )}
        </button>
      )}
      {status === "ready" && (
        <button
          type="button"
          onClick={() => updateStatus("delivered")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading === "delivered" ? (
            <>
              <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
              <span>Updating…</span>
            </>
          ) : (
            "Mark delivered"
          )}
        </button>
      )}
    </div>
  );
}

type Tab = "current" | "history";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready for pickup" },
  { value: "delivered", label: "Delivered" },
  { value: "declined", label: "Declined" },
] as const;

export function OrdersList() {
  const [tab, setTab] = useState<Tab>("current");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = useCallback(async (historyMode?: boolean) => {
    const isHistory = historyMode ?? tab === "history";
    try {
      setError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const url = isHistory ? "/api/dashboard/orders?history=1" : "/api/dashboard/orders";
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      if (!res.ok) throw new Error("Failed to load orders");
      const text = await res.text();
      let data: Order[] = [];
      try {
        if (text) data = JSON.parse(text);
      } catch {
        setOrders([]);
        return;
      }
      setOrders(data);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Is the server running? Run: npm run dev");
      } else if (e instanceof Error && e.message.includes("Session expired")) {
        setError(e.message + " Go to the login page and sign in again.");
      } else {
        setError((e instanceof Error ? e.message : "Could not load orders") + " Make sure the server is running (npm run dev).");
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    void fetchOrders();
  }, [tab, fetchOrders]);

  useEffect(() => {
    if (tab !== "current") return;
    const t = setInterval(() => void fetchOrders(false), 15000);
    return () => clearInterval(t);
  }, [tab, fetchOrders]);

  useEffect(() => {
    setStatusFilter("all");
    setTableFilter("all");
    setStationFilter("all");
    setSearchQuery("");
  }, [tab]);

  const tableOptions = useMemo(() => {
    const byToken = new Map<string, string>();
    for (const o of orders) {
      byToken.set(o.table.token, o.table.name);
    }
    return Array.from(byToken.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const stationOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasDefault = false;
    for (const o of orders) {
      for (const item of o.items) {
        const s = item.menuItem.station ?? item.menuItem.category?.station ?? null;
        if (s) byId.set(s.id, s.name);
        else hasDefault = true;
      }
    }
    const list = Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    if (hasDefault) list.unshift(["__default", "Kitchen (default)"]);
    return list;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && (o.status ?? "pending") !== statusFilter) return false;
      if (tableFilter !== "all" && o.table.token !== tableFilter) return false;
      if (stationFilter !== "all") {
        const effectiveStation = (i: OrderItem) => i.menuItem.station ?? i.menuItem.category?.station ?? null;
        const match = stationFilter === "__default"
          ? o.items.some((i) => !effectiveStation(i))
          : o.items.some((i) => effectiveStation(i)?.id === stationFilter);
        if (!match) return false;
      }
      if (q) {
        const itemNames = o.items.map((i) => i.menuItem.name).join(" ");
        const blob = `${o.table.name} ${o.table.token} ${itemNames}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, tableFilter, stationFilter, searchQuery]);

  const filtersActive =
    statusFilter !== "all" || tableFilter !== "all" || stationFilter !== "all" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter("all");
    setTableFilter("all");
    setStationFilter("all");
    setSearchQuery("");
  };

  const tabButtons = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setTab("current")}
        className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          tab === "current"
            ? "bg-primary text-white shadow-sm ring-1 ring-black/10"
            : "border-2 border-border bg-card text-ink hover:bg-surface"
        }`}
      >
        Current
      </button>
      <button
        type="button"
        onClick={() => setTab("history")}
        className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          tab === "history"
            ? "bg-primary text-white shadow-sm ring-1 ring-black/10"
            : "border-2 border-border bg-card text-ink hover:bg-surface"
        }`}
      >
        History
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-4">{tabButtons}</div>
        <div className="flex items-center gap-2 text-ink-muted">
          <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading orders…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-4">{tabButtons}</div>
        <div className="rounded-xl border border-border bg-card p-4 text-ink text-sm shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  const filterToolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search table or items…"
        aria-label="Search orders"
        className="min-h-[44px] w-full sm:flex-1 sm:min-w-[200px] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Status"
          className="min-h-[44px] min-w-[10.5rem] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          aria-label="Table"
          className="min-h-[44px] min-w-[9rem] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
        >
          <option value="all">All tables</option>
          {tableOptions.map(([token, name]) => (
            <option key={token} value={token}>
              {name}
            </option>
          ))}
        </select>
        {stationOptions.length > 0 && (
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            aria-label="Station"
            className="min-h-[44px] min-w-[9rem] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All stations</option>
            {stationOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-[44px] rounded-xl border-2 border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-card"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-ink-muted mb-4">
            {tab === "current"
              ? "Active orders. List refreshes every 15 seconds."
              : "Delivered orders and those declined at wait staff."}
          </p>
          {tabButtons}
        </div>
        {filterToolbar}
        <KitchenTicketPrintHint />
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <p className="text-ink-muted font-medium">
            {tab === "current" ? "No active orders" : "No order history yet"}
          </p>
          <p className="text-sm text-ink-muted mt-1">
            {tab === "current"
              ? "When guests order via the QR menu, they’ll show up here. If “Send new orders to wait staff first” is on in Options, orders appear on Wait staff first until someone sends them to the kitchen."
              : "Delivered and declined orders will appear here."}
          </p>
        </div>
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-ink-muted mb-4">
            {tab === "current"
              ? "Active orders. List refreshes every 15 seconds."
              : "Order history (delivered & declined)."}
          </p>
          {tabButtons}
        </div>
        {filterToolbar}
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <p className="text-ink font-medium">No orders match your filters</p>
          <p className="text-sm text-ink-muted mt-1">
            Try another status, table, or search — or tap Reset.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-ink-muted mb-4">
          {tab === "current"
            ? "Active orders. List refreshes every 15 seconds."
            : "Order history (delivered & declined)."}
          {filtersActive && (
            <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0 text-ink font-medium">
              Showing {filteredOrders.length} of {orders.length}
            </span>
          )}
        </p>
        {tabButtons}
      </div>
      {filterToolbar}
      <KitchenTicketPrintHint />
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const payLine = payLineLabel(order);
          const paySettled = isOrderPaymentSettled(order);
          return (
          <div
            key={order.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <span className="font-bold text-ink">{order.table.name}</span>
                <span className="ml-2 text-sm text-ink-muted">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <OrderStatusBadge status={order.status ?? "pending"} />
                {payLine ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      paySettled
                        ? "bg-emerald-100 text-emerald-950 ring-emerald-700/40 group-data-[theme=dark]/dashboard:bg-emerald-950/35 group-data-[theme=dark]/dashboard:text-emerald-50 group-data-[theme=dark]/dashboard:ring-emerald-500/45"
                        : "bg-surface text-ink-muted ring-border"
                    }`}
                  >
                    {payLine}
                  </span>
                ) : null}
                <span className="text-lg font-bold text-ink">{formatPrice(order.totalAmount)}</span>
                <Link
                  href={`/dashboard/orders/print/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens a printable kitchen slip in a new tab (browser print or PDF)"
                  className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface min-h-[32px] inline-flex items-center"
                >
                  Print ticket
                </Link>
                {tab === "current" && (
                  <OrderStatusActions orderId={order.id} status={order.status ?? "pending"} onUpdated={() => fetchOrders()} />
                )}
              </div>
            </div>
            <ul className="text-sm space-y-2">
              {order.items.map((line, i) => {
                const extra = [line.notes, line.selectedOptionsSummary].filter(Boolean).join(" · ");
                const stName = line.menuItem.station?.name ?? line.menuItem.category?.station?.name;
                return (
                  <li key={i} className="flex justify-between gap-2 py-1.5 border-b border-border/60 last:border-0">
                    <div>
                      <span className="font-medium text-ink">{line.quantity}× {line.menuItem.name}</span>
                      {stName && (
                        <span className="ml-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
                          {stName}
                        </span>
                      )}
                      {extra && (
                        <span className="block text-xs text-ink-muted mt-0.5">
                          {extra}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-ink shrink-0">{formatPrice(line.unitPrice * line.quantity)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
        })}
      </div>
    </div>
  );
}
