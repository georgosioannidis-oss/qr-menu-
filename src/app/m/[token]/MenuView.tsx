"use client";

/**
 * Guest menu UI: category tabs, item cards, cart drawer, optional modifiers, Stripe checkout redirect.
 * Data comes from the server page (`page.tsx`); this file only handles interaction state and API calls.
 */

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

/** Guest menu UI copy (English only until i18n returns). */
const M = {
  /** After returning from Stripe (?paid=1) */
  paymentSuccessfulCombined: "Payment successful. Your order was sent.",
  /** After pay-at-table order */
  thankYouAfterOrder: "Order sent. Thank you!",
  /** Stripe: one line before Pay now */
  stripePayPrompt: "Order placed — pay below to confirm your order.",
  backToMenu: "Back to menu",
  yourOrders: "Your orders",
  yourOrdersHint:
    "Orders from this table in roughly the last 24 hours (so new guests don’t see old visits). Tap one for status.",
  noOrdersYet: "No orders from this table yet.",
  couldNotLoadOrders: "Could not load orders. Try again.",
  cancel: "Cancel",
  emptyMenuTitle: "No dishes to show yet",
  emptyMenuHint:
    "This table link works, but the restaurant hasn’t published any menu items (or they’re all hidden). Ask the owner to add items in the dashboard, or run the demo seed: npm run db:seed",
  emptyMenuWrongLink: "If you expected a menu, check the QR link or URL (e.g. /m/table-1 for the demo).",
  orderingPausedTitle: "Not taking orders right now",
  orderingPausedHint:
    "The kitchen is at capacity. Please speak to a member of staff if you need anything. Pull down on this page to refresh.",
  callWaiterAria: "Call waiter to your table",
  callWaiterCaption: "Call a waiter",
  callWaiterSent: "We’ve let the staff know someone will come by.",
  callWaiterFailed: "Couldn’t reach the restaurant. Try again in a moment.",
  payNow: "Pay now",
  viewPhoto: "View photo",
  customiseAdd: "Customise & add",
  addToOrder: "Add to order",
  close: "Close",
  yourOrder: "Your order",
  swipeToRemove: "Swipe left to remove",
  decreaseQty: "Decrease quantity",
  increaseQty: "Increase quantity",
  remove: "Remove",
  total: "Total",
  placingOrder: "Placing order…",
  placeOrderPay: "Place order & pay",
  howToPay: "How will you pay?",
  payCardAtTable: "Card",
  payCardAtTableHint: "Pay at the table (terminal or reader)",
  payCash: "Cash",
  payCashHint: "Pay with cash to staff",
  choosePayment: "Choose how you will pay.",
  paymentModalSubtitle: "Tap an option to place your order.",
  viewCart: "View cart",
  placeOrder: "Place order",
  placing: "Placing…",
  chooseOptions: "Choose your options, then add to order.",
  noteKitchen: "Note for the kitchen",
  noteOptional: "(optional)",
  notePlaceholder: "e.g. No onions, allergy to nuts…",
  addToOrderBtn: "Add to order",
} as const;

function itemsInCartLabel(count: number) {
  return count === 1 ? `${count} item in cart` : `${count} items in cart`;
}

/** Simple credit-card glyph for the pay-at-table modal */
function PaymentCardGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="5" y="11" width="38" height="26" rx="4" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 19h38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="10" y="27" width="14" height="4" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="28" y="27" width="10" height="4" rx="1.5" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/** Bill / banknote glyph for cash — single note (no stacked “ghost” shape) */
function PaymentCashGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="7" y="13" width="34" height="22" rx="3" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="24" cy="24" r="2.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Bell — “call waiter” floating action */
function WaiterBellGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

type OptionChoice = { id: string; label: string; priceCents: number };
type OptionGroup = {
  id: string;
  label: string;
  required: boolean;
  type: "single" | "multi";
  choices: OptionChoice[];
};

type Item = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  optionGroups?: OptionGroup[];
};

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type CartItem = Item & {
  quantity: number;
  notes?: string;
  selectedOptions?: Record<string, string | string[]>;
  optionPriceModifier?: number;
  optionSummary?: string; // e.g. "Medium, Extra cheese" for display
};

function cartLineKey(c: CartItem) {
  return `${c.id}|${c.notes ?? ""}|${JSON.stringify(c.selectedOptions ?? {})}`;
}

type TableOrderSummary = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
  /** True when staff must still send this order to the kitchen (wait-staff relay). */
  waiterRelayPending?: boolean;
};

function guestOrderStatusLabel(status: string, waiterRelayPending?: boolean): string {
  if (waiterRelayPending && status === "paid") {
    return "Waiting for staff";
  }
  const map: Record<string, string> = {
    pending: "Awaiting payment",
    paid: "Order accepted",
    preparing: "Preparing",
    ready: "Ready for pickup",
    delivered: "Delivered",
    declined: "Order declined",
  };
  return map[status] ?? status;
}

function formatOrderWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

type Props = {
  restaurantName: string;
  tableName: string;
  tableToken: string;
  tableLogoUrl?: string;
  paidSuccess?: boolean;
  usesOnlineCheckout?: boolean;
  payAtTableCardEnabled?: boolean;
  payAtTableCashEnabled?: boolean;
  /** Kitchen overload: block new guest orders from this QR link (staff flow unchanged). */
  guestOrderingPaused?: boolean;
  categories: Category[];
};

export function MenuView({
  restaurantName,
  tableName,
  tableToken,
  tableLogoUrl,
  paidSuccess = false,
  usesOnlineCheckout = false,
  payAtTableCardEnabled = true,
  payAtTableCashEnabled = true,
  guestOrderingPaused = false,
  categories,
}: Props) {
  const formatPrice = useCallback(
    (cents: number) =>
      new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100),
    []
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [isPlacing, setIsPlacing] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [showPaidSuccess, setShowPaidSuccess] = useState(paidSuccess);
  const [showPostOrderThankYou, setShowPostOrderThankYou] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<TableOrderSummary[] | null>(null);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistoryError, setOrderHistoryError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [optionsModalItem, setOptionsModalItem] = useState<Item | null>(null);
  const [imagePreviewItem, setImagePreviewItem] = useState<Item | null>(null);
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const mainRef = useRef<HTMLElement>(null);
  const pullStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [callWaiterBusy, setCallWaiterBusy] = useState(false);

  const callWaiter = useCallback(async () => {
    setCallWaiterBusy(true);
    toast.success(M.callWaiterSent);
    try {
      const res = await fetch("/api/customer/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken }),
      });
      if (!res.ok) {
        const text = await res.text();
        let data: { error?: string } = {};
        try { if (text) data = JSON.parse(text); } catch { /* ignore */ }
        toast.error(data.error ?? M.callWaiterFailed);
      }
    } catch {
      toast.error(M.callWaiterFailed);
    } finally {
      setCallWaiterBusy(false);
    }
  }, [tableToken]);

  useEffect(() => {
    if (!categories.some((c) => c.id === activeCategory)) {
      setActiveCategory(categories[0]?.id ?? "");
    }
  }, [categories, activeCategory]);

  /** Highlight the category in view while scrolling the full menu. */
  useEffect(() => {
    const root = mainRef.current;
    if (!root || categories.length === 0) return;
    const elements = categories
      .map((c) => document.getElementById(`menu-cat-${c.id}`))
      .filter((n): n is HTMLElement => n != null);
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target?.id?.startsWith("menu-cat-")) {
          setActiveCategory(top.target.id.slice("menu-cat-".length));
        }
      },
      { root, rootMargin: "-28% 0px -55% 0px", threshold: [0, 0.08, 0.2, 0.35, 0.5] }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [categories]);

  const scrollToCategory = useCallback((id: string) => {
    setActiveCategory(id);
    document.getElementById(`menu-cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!orderHistoryOpen) return;
    let cancelled = false;
    async function load() {
      setOrderHistoryLoading(true);
      setOrderHistoryError(null);
      try {
        const res = await fetch(
          `/api/orders/for-table?tableToken=${encodeURIComponent(tableToken)}`
        );
        const text = await res.text();
        let data: { error?: string; orders?: TableOrderSummary[] } = {};
        try {
          if (text) data = JSON.parse(text) as { error?: string; orders?: TableOrderSummary[] };
        } catch {
          if (!cancelled) {
            setOrderHistoryError(M.couldNotLoadOrders);
            setOrderHistory(null);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setOrderHistoryError(data.error || M.couldNotLoadOrders);
            setOrderHistory(null);
          }
          return;
        }
        if (!cancelled) setOrderHistory(Array.isArray(data.orders) ? data.orders : []);
      } catch {
        if (!cancelled) {
          setOrderHistoryError(M.couldNotLoadOrders);
          setOrderHistory(null);
        }
      } finally {
        if (!cancelled) setOrderHistoryLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderHistoryOpen, tableToken]);

  const totalCents = cart.reduce(
    (sum, i) => sum + (i.price + (i.optionPriceModifier ?? 0)) * i.quantity,
    0
  );
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  const addToCart = (
    item: Item,
    notes?: string,
    selectedOptions?: Record<string, string | string[]>,
    optionPriceModifier?: number,
    optionSummary?: string
  ) => {
    setCart((prev) => {
      const newLine: CartItem = {
        ...item,
        quantity: 1,
        notes,
        selectedOptions,
        optionPriceModifier: optionPriceModifier ?? 0,
        optionSummary,
      };
      const key = cartLineKey(newLine);
      const existing = prev.find((c) => cartLineKey(c) === key);
      if (existing) {
        return prev.map((c) => (cartLineKey(c) === key ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, newLine];
    });
    setOptionsModalItem(null);
  };

  const updateQuantity = (line: CartItem, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (cartLineKey(c) !== cartLineKey(line)) return c;
          const q = c.quantity + delta;
          return q <= 0 ? null : { ...c, quantity: q };
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const removeFromCart = (line: CartItem) => {
    setCart((prev) => prev.filter((c) => cartLineKey(c) !== cartLineKey(line)));
  };

  const submitOrder = async (paymentPreference?: "card" | "cash") => {
    if (cart.length === 0) return;
    if (!usesOnlineCheckout) {
      const needsPick =
        payAtTableCardEnabled &&
        payAtTableCashEnabled &&
        (paymentPreference !== "card" && paymentPreference !== "cash");
      if (needsPick) {
        toast.error(M.choosePayment);
        return;
      }
    }
    setIsPlacing(true);

    const savedCart = [...cart];
    const payload: Record<string, unknown> = {
      tableToken,
      items: cart.map((c) => ({
        menuItemId: c.id,
        quantity: c.quantity,
        unitPrice: c.price,
        notes: c.notes ?? undefined,
        selectedOptions: c.selectedOptions ?? undefined,
        optionPriceModifier: c.optionPriceModifier ?? 0,
      })),
      totalAmount: totalCents,
    };
    if (!usesOnlineCheckout && paymentPreference) {
      payload.paymentPreference = paymentPreference;
    }

    if (!usesOnlineCheckout) {
      setPaymentModalOpen(false);
      setCart([]);
      setCartOpen(false);
      setShowPostOrderThankYou(true);
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: { error?: string; orderId?: string; checkoutUrl?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error("Invalid response from server");
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to place order");

      if (usesOnlineCheckout) {
        setPaymentModalOpen(false);
        if (data.checkoutUrl) {
          setPayUrl(data.checkoutUrl);
        } else {
          setCart([]);
          setCartOpen(false);
          setShowPostOrderThankYou(true);
        }
      }
    } catch (e) {
      if (!usesOnlineCheckout) {
        setCart(savedCart);
        setShowPostOrderThankYou(false);
      }
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsPlacing(false);
    }
  };

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;
    if (usesOnlineCheckout) {
      void submitOrder();
      return;
    }
    if (payAtTableCardEnabled && payAtTableCashEnabled) {
      setPaymentModalOpen(true);
      return;
    }
    if (payAtTableCardEnabled) void submitOrder("card");
    else void submitOrder("cash");
  };

  const thankYouIcon = (
    <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-3xl mx-auto mb-4 ring-1 ring-primary/25 animate-pulse">
      ⏳
    </div>
  );

  if (showPaidSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-sm w-full text-center bg-card rounded-3xl shadow-lg border border-border p-8">
          {thankYouIcon}
          <h2 className="text-xl font-bold text-ink mb-6 leading-snug">{M.paymentSuccessfulCombined}</h2>
          <button
            type="button"
            onClick={() => setShowPaidSuccess(false)}
            className="min-h-[48px] w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-sm ring-1 ring-black/10"
          >
            {M.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  if (showPostOrderThankYou) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-sm w-full text-center bg-card rounded-3xl shadow-lg border border-border p-8">
          {tableLogoUrl ? (
            <img src={tableLogoUrl} alt="" className="h-10 w-auto mx-auto mb-3 object-contain" />
          ) : null}
          {thankYouIcon}
          <h2 className="text-xl font-bold text-ink mb-6 leading-snug">{M.thankYouAfterOrder}</h2>
          <button
            type="button"
            onClick={() => setShowPostOrderThankYou(false)}
            className="min-h-[48px] w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-sm ring-1 ring-black/10"
          >
            {M.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  if (guestOrderingPaused) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 shadow-sm text-center">
          {tableLogoUrl ? (
            <img src={tableLogoUrl} alt="" className="h-12 w-auto mx-auto mb-4 object-contain" />
          ) : null}
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-1">{restaurantName}</p>
          <p className="text-xs text-ink-muted mb-5">{tableName}</p>
          <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 flex items-center justify-center text-2xl mx-auto mb-4 ring-1 ring-amber-500/25">
            ⏸
          </div>
          <h2 className="text-xl font-bold text-ink mb-3 leading-snug">{M.orderingPausedTitle}</h2>
          <p className="text-base leading-relaxed text-ink-muted sm:text-sm">{M.orderingPausedHint}</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold text-ink mb-2">{M.emptyMenuTitle}</h2>
          <p className="text-base leading-relaxed text-ink-muted mb-4 sm:text-sm">{M.emptyMenuHint}</p>
          <p className="text-sm text-ink-muted sm:text-xs">{M.emptyMenuWrongLink}</p>
        </div>
      </div>
    );
  }

  if (payUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
        <div className="max-w-sm w-full text-center bg-card rounded-3xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-bold text-ink mb-6 leading-snug">{M.stripePayPrompt}</h2>
          <a
            href={payUrl}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-center shadow-md ring-1 ring-black/10"
          >
            {M.payNow}
          </a>
        </div>
      </div>
    );
  }

  const hasOptions = (item: Item) =>
    item.optionGroups && item.optionGroups.length > 0;

  const onMainTouchStart = (e: React.TouchEvent) => {
    const el = mainRef.current;
    if (!el || el.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  };

  const onMainTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current == null) return;
    const el = mainRef.current;
    if (!el || el.scrollTop > 0) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullDistance(Math.min(dy, 80));
  };

  const onMainTouchEnd = () => {
    if (pullDistance > 48) {
      startRefreshTransition(() => { router.refresh(); });
    }
    pullStartY.current = null;
    setPullDistance(0);
  };

  const catalogChromeOnly =
    !cartOpen &&
    !orderHistoryOpen &&
    !paymentModalOpen &&
    !optionsModalItem &&
    !imagePreviewItem;

  const mainBottomPad =
    totalItems > 0
      ? "pb-[calc(11rem+env(safe-area-inset-bottom,0px))]"
      : "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-surface">
      <header className="sticky top-0 z-[15] shrink-0 border-b border-border bg-surface/95 shadow-sm backdrop-blur-[6px]">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {tableLogoUrl && (
                <img
                  src={tableLogoUrl}
                  alt=""
                  className="h-10 w-auto max-w-[100px] object-contain object-left shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="line-clamp-2 break-words text-[1.35rem] font-bold leading-tight tracking-tight text-ink sm:text-xl">
                  {restaurantName}
                </h1>
                <p className="mt-0.5 line-clamp-2 break-words text-base text-ink-muted sm:text-sm">
                  {tableName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOrderHistoryOpen(true)}
              className="shrink-0 min-h-[44px] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:border-primary/40 hover:bg-primary/5"
            >
              {M.yourOrders}
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [-webkit-overflow-scrolling:touch]">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => scrollToCategory(c.id)}
              className={`shrink-0 min-h-[44px] px-4 py-2.5 rounded-full text-base font-medium leading-snug transition-all sm:text-sm ${
                activeCategory === c.id
                  ? "bg-primary text-white shadow-md ring-1 ring-black/10"
                  : "bg-card text-ink border-2 border-border shadow-sm hover:border-ink/25 hover:bg-surface"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      <main
        ref={mainRef}
        className={`mx-auto min-h-0 w-full max-w-lg flex-1 scroll-pt-[11rem] overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-5 sm:scroll-pt-[10.5rem] ${mainBottomPad}`}
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
        style={{ transform: pullDistance ? `translateY(${pullDistance * 0.35}px)` : undefined }}
      >
        {categories.map((cat, catIndex) => (
          <section
            key={cat.id}
            id={`menu-cat-${cat.id}`}
            className={`scroll-mt-[11rem] sm:scroll-mt-[10.5rem] ${catIndex > 0 ? "mt-12 border-t border-border/60 pt-10 sm:mt-10 sm:pt-8" : ""}`}
          >
            <h2 className="mb-5 text-[0.95rem] font-semibold uppercase tracking-wide text-ink-muted sm:mb-4 sm:text-base">
              {cat.name}
            </h2>
            <ul className="space-y-3">
              {cat.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:gap-4"
                >
                  {item.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImagePreviewItem(item)}
                      className="min-h-[44px] min-w-[44px] shrink-0 self-start sm:self-auto"
                      aria-label={M.viewPhoto}
                    >
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-24 w-24 rounded-xl object-cover sm:h-24 sm:w-24"
                      />
                    </button>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="text-lg font-semibold leading-snug text-ink sm:text-base">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-base leading-relaxed text-ink-muted sm:text-sm">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="shrink-0 text-lg font-bold tabular-nums text-primary sm:text-xl">
                        {formatPrice(item.price)}
                      </span>
                      {hasOptions(item) ? (
                        <button
                          type="button"
                          onClick={() => setOptionsModalItem(item)}
                          className="min-h-[44px] w-full min-w-0 rounded-full border-2 border-primary bg-card px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 sm:max-w-[12.5rem] sm:flex-1 sm:text-base"
                        >
                          {M.customiseAdd}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="min-h-[44px] w-full min-w-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-black/10 transition-colors hover:bg-primary-hover sm:max-w-[12.5rem] sm:flex-1 sm:text-base"
                        >
                          {M.addToOrder}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {catalogChromeOnly ? (
        <div
          className="pointer-events-none fixed right-3 z-[18] flex flex-col items-center gap-1 sm:right-4"
          style={{
            bottom: totalItems > 0 ? "7.75rem" : "max(1rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <button
            type="button"
            onClick={() => void callWaiter()}
            disabled={callWaiterBusy}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg ring-2 ring-violet-400/50 transition hover:bg-violet-700 active:scale-95 disabled:opacity-55 dark:bg-violet-600 dark:ring-violet-400/35 dark:hover:bg-violet-500"
            aria-label={M.callWaiterAria}
            title={M.callWaiterAria}
          >
            {callWaiterBusy ? (
              <Spinner className="h-6 w-6 border-white border-t-transparent" label="" />
            ) : (
              <WaiterBellGlyph className="h-7 w-7" />
            )}
          </button>
          <span className="pointer-events-none max-w-[6rem] text-center text-[0.68rem] font-medium leading-tight text-ink-muted">
            {M.callWaiterCaption}
          </span>
        </div>
      ) : null}

      {optionsModalItem && (
        <ItemOptionsModal
          item={optionsModalItem}
          onAdd={(notes, selectedOptions, optionPriceModifier, optionSummary) =>
            addToCart(
              optionsModalItem,
              notes,
              selectedOptions,
              optionPriceModifier,
              optionSummary
            )
          }
          onClose={() => setOptionsModalItem(null)}
          formatPrice={formatPrice}
        />
      )}

      {imagePreviewItem && (
        <div
          className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center px-4"
          onClick={() => setImagePreviewItem(null)}
        >
          <div
            className="max-w-md w-full bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {imagePreviewItem.imageUrl && (
              <img
                src={imagePreviewItem.imageUrl}
                alt={imagePreviewItem.name}
                className="w-full max-h-[60vh] object-cover"
              />
            )}
            <div className="p-4">
              <p className="font-semibold text-ink text-base">{imagePreviewItem.name}</p>
              {imagePreviewItem.description && (
                <p className="text-base leading-relaxed text-ink-muted mt-1 sm:text-sm">
                  {imagePreviewItem.description}
                </p>
              )}
              <button
                type="button"
                onClick={() => setImagePreviewItem(null)}
                className="mt-4 w-full min-h-[48px] rounded-xl border-2 border-border bg-surface text-base font-semibold text-ink hover:bg-ink/5 sm:text-sm"
              >
                {M.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="fixed inset-0 z-[35] flex items-end justify-center bg-black/50"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-auto rounded-t-3xl bg-card shadow-2xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[1.35rem] font-bold leading-tight text-ink sm:text-xl">{M.yourOrder}</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-full bg-surface text-ink border-2 border-border hover:bg-ink/5 flex items-center justify-center text-lg leading-none font-bold"
                aria-label={M.close}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-ink-muted mb-2 sm:text-xs">{M.swipeToRemove}</p>
            <ul className="space-y-4 mb-5">
              {cart.map((i) => (
                <CartLineRow
                  key={cartLineKey(i)}
                  line={i}
                  tEachQty={`${formatPrice(i.price + (i.optionPriceModifier ?? 0))} each × ${i.quantity}`}
                  onDecrease={() => updateQuantity(i, -1)}
                  onIncrease={() => updateQuantity(i, 1)}
                  onRemove={() => removeFromCart(i)}
                  labels={{
                    decrease: M.decreaseQty,
                    increase: M.increaseQty,
                    remove: M.remove,
                  }}
                />
              ))}
            </ul>
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-medium text-ink-muted sm:text-sm">{M.total}</span>
              <span className="text-xl font-bold tabular-nums text-ink">{formatPrice(totalCents)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                handlePlaceOrderClick();
              }}
              disabled={isPlacing}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-white shadow-lg ring-1 ring-black/10 transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              {isPlacing ? (
                <>
                  <Spinner className="h-5 w-5 border-white border-t-transparent" label={M.placingOrder} />
                  {M.placingOrder}
                </>
              ) : usesOnlineCheckout ? (
                M.placeOrderPay
              ) : (
                M.placeOrder
              )}
            </button>
          </div>
        </div>
      )}

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[25] shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-ink-muted sm:text-sm">
                {itemsInCartLabel(totalItems)}
              </span>
              <span className="text-xl font-bold tabular-nums text-ink sm:text-lg">{formatPrice(totalCents)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 [@media(min-width:420px)]:flex-row [@media(min-width:420px)]:gap-3">
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="min-h-[48px] w-full min-w-0 flex-1 rounded-xl border-2 border-primary bg-card py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 [@media(min-width:420px)]:py-3.5 sm:text-base"
              >
                {M.viewCart}
              </button>
              <button
                type="button"
                onClick={handlePlaceOrderClick}
                disabled={isPlacing}
                className="flex min-h-[48px] w-full min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md ring-1 ring-black/10 transition-all hover:bg-primary-hover disabled:opacity-60 [@media(min-width:420px)]:py-3.5 sm:text-base"
              >
                {isPlacing ? (
                  <>
                    <Spinner className="h-4 w-4 border-white border-t-transparent" label={M.placing} />
                    {M.placing}
                  </>
                ) : usesOnlineCheckout ? (
                  M.placeOrderPay
                ) : (
                  M.placeOrder
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && !usesOnlineCheckout && payAtTableCardEnabled && payAtTableCashEnabled ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-3 py-6 sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          onClick={() => !isPlacing && setPaymentModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 pb-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="payment-modal-title" className="text-xl font-bold text-ink text-center sm:text-2xl">
              {M.howToPay}
            </h2>
            <p className="mt-1 text-base text-ink-muted text-center sm:text-sm">{M.paymentModalSubtitle}</p>
            <div className="mt-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[400px]:gap-4 sm:mt-6 sm:gap-5">
              <button
                type="button"
                disabled={isPlacing}
                onClick={() => void submitOrder("card")}
                className="group flex min-h-[8.5rem] flex-col items-center justify-center rounded-3xl border-2 border-border bg-card px-4 py-5 text-center shadow-sm transition-all hover:border-primary/50 hover:bg-primary/[0.06] active:scale-[0.98] disabled:opacity-50 min-[400px]:min-h-[10.5rem] min-[400px]:px-5 min-[400px]:py-7 sm:min-h-[12.25rem] sm:py-8"
              >
                <PaymentCardGlyph className="h-14 w-14 shrink-0 text-primary min-[400px]:h-[4.5rem] min-[400px]:w-[4.5rem] sm:h-24 sm:w-24" />
                <span className="mt-3 text-lg font-bold text-ink min-[400px]:mt-4 min-[400px]:text-xl sm:text-2xl">
                  {M.payCardAtTable}
                </span>
                <span className="mt-1.5 max-w-[14rem] px-1 text-xs leading-snug text-ink-muted min-[400px]:mt-2 min-[400px]:text-sm sm:text-base">
                  {M.payCardAtTableHint}
                </span>
              </button>
              <button
                type="button"
                disabled={isPlacing}
                onClick={() => void submitOrder("cash")}
                className="group flex min-h-[8.5rem] flex-col items-center justify-center rounded-3xl border-2 border-border bg-card px-4 py-5 text-center shadow-sm transition-all hover:border-primary/50 hover:bg-primary/[0.06] active:scale-[0.98] disabled:opacity-50 min-[400px]:min-h-[10.5rem] min-[400px]:px-5 min-[400px]:py-7 sm:min-h-[12.25rem] sm:py-8"
              >
                <PaymentCashGlyph className="h-14 w-14 shrink-0 text-primary min-[400px]:h-[4.5rem] min-[400px]:w-[4.5rem] sm:h-24 sm:w-24" />
                <span className="mt-3 text-lg font-bold text-ink min-[400px]:mt-4 min-[400px]:text-xl sm:text-2xl">
                  {M.payCash}
                </span>
                <span className="mt-1.5 max-w-[14rem] px-1 text-xs leading-snug text-ink-muted min-[400px]:mt-2 min-[400px]:text-sm sm:text-base">
                  {M.payCashHint}
                </span>
              </button>
            </div>
            {isPlacing ? (
              <div className="mt-5 flex items-center justify-center gap-2 text-base text-ink-muted">
                <Spinner className="h-5 w-5 border-primary border-t-transparent" label={M.placingOrder} />
                {M.placingOrder}
              </div>
            ) : null}
            <button
              type="button"
              disabled={isPlacing}
              onClick={() => setPaymentModalOpen(false)}
              className="mt-5 w-full min-h-[52px] rounded-2xl border-2 border-border bg-surface text-base font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
            >
              {M.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {orderHistoryOpen ? (
        <div
          className="fixed inset-0 z-[41] flex items-end justify-center bg-black/55 sm:items-center sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-history-title"
          onClick={() => setOrderHistoryOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[80vh] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border px-5 py-4">
              <h2 id="order-history-title" className="text-lg font-bold text-ink sm:text-xl">
                {M.yourOrders}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{M.yourOrdersHint}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
              {orderHistoryLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-ink-muted">
                  <Spinner className="h-6 w-6 border-primary border-t-transparent" label="" />
                  <span className="text-sm">{M.placingOrder}</span>
                </div>
              ) : orderHistoryError ? (
                <p className="py-10 text-center text-sm text-red-800">{orderHistoryError}</p>
              ) : !orderHistory || orderHistory.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-muted">{M.noOrdersYet}</p>
              ) : (
                <ul className="space-y-2 pb-2">
                  {orderHistory.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/m/${tableToken}/order/${o.id}`}
                        onClick={() => setOrderHistoryOpen(false)}
                        className="flex min-h-[52px] flex-col rounded-2xl border-2 border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {guestOrderStatusLabel(o.status, o.waiterRelayPending)}
                          </span>
                          <span className="shrink-0 text-base font-bold tabular-nums text-ink">
                            {formatPrice(o.totalAmount)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                          <span>{formatOrderWhen(o.createdAt)}</span>
                          <span aria-hidden>·</span>
                          <span>
                            {o.itemCount === 1 ? "1 item" : `${o.itemCount} items`}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <button
                type="button"
                onClick={() => setOrderHistoryOpen(false)}
                className="min-h-[48px] w-full rounded-xl border-2 border-border bg-card text-base font-semibold text-ink hover:bg-ink/5"
              >
                {M.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CartLineRow({
  line,
  tEachQty,
  onDecrease,
  onIncrease,
  onRemove,
  labels,
}: {
  line: CartItem;
  tEachQty: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  labels: { decrease: string; increase: string; remove: string };
}) {
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (dx > 56) onRemove();
  };

  return (
    <li
      className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-0"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-snug text-ink sm:text-sm">{line.name}</p>
        <p className="text-base text-ink-muted mt-0.5 sm:text-sm">{tEachQty}</p>
        {(line.notes || line.optionSummary) && (
          <p className="text-sm text-ink-muted mt-1 italic sm:text-xs">
            {[line.notes, line.optionSummary].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex max-w-full flex-wrap items-center justify-end gap-1 sm:flex-nowrap sm:justify-start">
        <button
          type="button"
          onClick={onDecrease}
          className="min-h-[44px] min-w-[44px] rounded-full bg-surface text-ink font-medium hover:bg-ink/10 transition-colors flex items-center justify-center"
          aria-label={labels.decrease}
        >
          −
        </button>
        <span className="w-8 text-center font-semibold text-ink">{line.quantity}</span>
        <button
          type="button"
          onClick={onIncrease}
          className="min-h-[44px] min-w-[44px] rounded-full bg-surface text-ink font-medium hover:bg-ink/10 transition-colors flex items-center justify-center"
          aria-label={labels.increase}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !confirmDestructiveAction(
                `Remove “${line.name}” from your order?`,
                "You can add it again from the menu."
              )
            )
              return;
            onRemove();
          }}
          className="ml-1 min-h-[44px] min-w-[72px] shrink-0 rounded-lg border-2 border-red-400 bg-red-50 px-3 text-base font-semibold text-red-900 hover:bg-red-100 sm:text-sm"
        >
          {labels.remove}
        </button>
      </div>
    </li>
  );
}

function ItemOptionsModal({
  item,
  onAdd,
  onClose,
  formatPrice,
}: {
  item: Item;
  onAdd: (
    notes: string,
    selectedOptions: Record<string, string | string[]>,
    optionPriceModifier: number,
    optionSummary?: string
  ) => void;
  onClose: () => void;
  formatPrice: (cents: number) => string;
}) {
  const groups = item.optionGroups ?? [];
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  const [notes, setNotes] = useState("");

  const optionPriceModifier = groups.reduce((sum, g) => {
    const sel = selections[g.id];
    if (g.type === "single" && typeof sel === "string") {
      const choice = g.choices.find((c) => c.id === sel);
      return sum + (choice?.priceCents ?? 0);
    }
    if (g.type === "multi" && Array.isArray(sel)) {
      return sum + sel.reduce((s, id) => {
        const choice = g.choices.find((c) => c.id === id);
        return s + (choice?.priceCents ?? 0);
      }, 0);
    }
    return sum;
  }, 0);

  const canSubmit = groups.every((g) => {
    const sel = selections[g.id];
    if (g.required) {
      if (g.type === "single") return typeof sel === "string" && sel;
      return Array.isArray(sel) && sel.length > 0;
    }
    return true;
  });

  const optionSummary = groups
    .map((g) => {
      const sel = selections[g.id];
      if (g.type === "single" && typeof sel === "string") {
        return g.choices.find((c) => c.id === sel)?.label;
      }
      if (g.type === "multi" && Array.isArray(sel)) {
        return sel
          .map((id) => g.choices.find((c) => c.id === id)?.label)
          .filter(Boolean)
          .join(", ");
      }
      return null;
    })
    .filter(Boolean)
    .join(", ");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(notes.trim(), selections, optionPriceModifier, optionSummary);
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md max-h-[90vh] overflow-auto rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold leading-tight text-ink sm:text-lg">{item.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-surface text-ink border-2 border-border hover:bg-ink/5 flex items-center justify-center text-lg leading-none font-bold"
            aria-label={M.close}
          >
            ✕
          </button>
        </div>
        <p className="text-base leading-relaxed text-ink-muted mb-4 sm:text-sm">{M.chooseOptions}</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {groups.map((g) => (
            <div key={g.id} className="pb-4 border-b border-border last:border-0">
              <p className="text-base font-semibold text-ink mb-2 sm:text-sm">
                {g.label}
                {g.required && <span className="text-red-600 ml-0.5">*</span>}
              </p>
              {g.type === "single" ? (
                <div className="space-y-2">
                  {g.choices.map((c) => (
                    <label
                      key={c.id}
                      className={`flex min-h-[48px] items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        selections[g.id] === c.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-ink/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name={g.id}
                        value={c.id}
                        checked={selections[g.id] === c.id}
                        onChange={() =>
                          setSelections((prev) => ({ ...prev, [g.id]: c.id }))
                        }
                        className="sr-only"
                      />
                      <span className="flex-1 font-medium text-ink">
                        {c.label}
                        {c.priceCents > 0 && (
                          <span className="text-ink-muted font-normal ml-1">
                            +{formatPrice(c.priceCents)}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {g.choices.map((c) => (
                    <label
                      key={c.id}
                      className={`flex min-h-[48px] items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        (selections[g.id] as string[] | undefined)?.includes(c.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-ink/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={(selections[g.id] as string[] | undefined)?.includes(c.id)}
                        onChange={(e) => {
                          const arr = ((selections[g.id] as string[] | undefined) ?? []).filter(
                            (id) => id !== c.id
                          );
                          if (e.target.checked) arr.push(c.id);
                          setSelections((prev) => ({ ...prev, [g.id]: arr }));
                        }}
                        className="h-5 w-5 min-h-[20px] min-w-[20px] shrink-0 rounded border-2 border-primary text-primary"
                      />
                      <span className="flex-1 font-medium text-ink">
                        {c.label}
                        {c.priceCents > 0 && (
                          <span className="text-ink-muted font-normal ml-1">
                            +{formatPrice(c.priceCents)}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div>
            <label className="mb-2 block text-base font-semibold text-ink sm:text-sm">
              {M.noteKitchen}{" "}
              <span className="font-normal text-ink-muted">{M.noteOptional}</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={M.notePlaceholder}
              className="w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none sm:text-sm"
              maxLength={300}
            />
          </div>
          <div className="flex items-center justify-between pt-2 gap-4">
            <span className="text-lg font-bold text-ink">
              {formatPrice(item.price + optionPriceModifier)}
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 min-h-[48px] rounded-xl bg-primary py-3.5 text-base font-semibold text-white shadow-md ring-1 ring-black/10 transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {M.addToOrderBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
