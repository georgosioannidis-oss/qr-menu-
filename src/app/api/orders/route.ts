/**
 * Public order API for guests. Validates `tableToken`, recomputes prices from DB (never trust client totals),
 * optional modifiers, then creates Order rows.
 *
 * - **Stripe** (restaurant `onlinePaymentEnabled` + keys + `NEXT_PUBLIC_APP_URL`): returns `checkoutUrl`; order stays `pending` until webhook sets `paid`.
 * - **Pay at table** (default): guest picks card and/or cash per venue settings; order is confirmed as `paid` with `paymentPreference`.
 * - Staff logged into the dashboard and ordering from `/m/...` skip the waiter relay queue (same cookies; `getDashboardServerSession(req)`).
 */
import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { requireWaitStaffApiAccess } from "@/lib/require-wait-staff-api";
import { restaurantUsesStripeCheckout } from "@/lib/restaurant-checkout";

const MAX_ITEMS = 50;
const MAX_QUANTITY = 10;
const MAX_NOTE_LENGTH = 500;

type OptionGroup = {
  id: string;
  label: string;
  required: boolean;
  type: "single" | "multi";
  choices: { id: string; label: string; priceCents: number }[];
};

function parseOptionGroups(s: string | null): OptionGroup[] {
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function computeOptionModifier(
  groups: OptionGroup[],
  selected: Record<string, string | string[]>
): number {
  let cents = 0;
  for (const g of groups) {
    const sel = selected[g.id];
    if (g.type === "single" && typeof sel === "string") {
      const c = g.choices.find((x) => x.id === sel);
      if (c) cents += c.priceCents;
    } else if (g.type === "multi" && Array.isArray(sel)) {
      for (const id of sel) {
        const c = g.choices.find((x) => x.id === id);
        if (c) cents += c.priceCents;
      }
    }
  }
  return cents;
}

function optionsSummary(groups: OptionGroup[], selected: Record<string, string | string[]>): string {
  const labels: string[] = [];
  for (const g of groups) {
    const sel = selected[g.id];
    if (g.type === "single" && typeof sel === "string") {
      const c = g.choices.find((x) => x.id === sel);
      if (c) labels.push(c.label);
    } else if (g.type === "multi" && Array.isArray(sel)) {
      for (const id of sel) {
        const c = g.choices.find((x) => x.id === id);
        if (c) labels.push(c.label);
      }
    }
  }
  return labels.join(", ");
}

function validateOptions(groups: OptionGroup[], selected: Record<string, string | string[]>): boolean {
  for (const g of groups) {
    const sel = selected[g.id];
    if (g.required) {
      if (g.type === "single") {
        if (typeof sel !== "string" || !g.choices.some((c) => c.id === sel)) return false;
      } else {
        if (!Array.isArray(sel) || sel.length === 0) return false;
        if (!sel.every((id) => g.choices.some((c) => c.id === id))) return false;
      }
    } else if (sel != null) {
      if (g.type === "single" && typeof sel === "string" && !g.choices.some((c) => c.id === sel))
        return false;
      if (g.type === "multi" && Array.isArray(sel) && !sel.every((id) => g.choices.some((c) => c.id === id)))
        return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableToken, items, totalAmount, paymentPreference: prefRaw } = body as {
      tableToken: string;
      items: {
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
        selectedOptions?: Record<string, string | string[]>;
        optionPriceModifier?: number;
      }[];
      totalAmount: number;
      paymentPreference?: string;
    };

    if (!tableToken || typeof tableToken !== "string" || tableToken.length > 100) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: "Items required (max " + MAX_ITEMS + ")" },
        { status: 400 }
      );
    }
    if (typeof totalAmount !== "number" || !Number.isInteger(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    const table = await prisma.table.findUnique({
      where: { token: tableToken },
      include: { restaurant: true },
    });

    if (!table) {
      return NextResponse.json({ error: "Invalid table" }, { status: 404 });
    }

    const session = await getDashboardServerSession(req);
    let staffSkipsWaiterRelay = false;
    if (session?.user?.restaurantId === table.restaurantId) {
      const denied = await requireWaitStaffApiAccess(session);
      staffSkipsWaiterRelay = denied === null;
    }

    if (table.restaurant.guestQrOrderingPaused === true && !staffSkipsWaiterRelay) {
      return NextResponse.json(
        {
          error:
            "This venue is not taking new orders from the menu right now. Please ask a member of staff.",
        },
        { status: 403 }
      );
    }

    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        category: { restaurantId: table.restaurantId, isAvailable: true },
        isAvailable: true,
      },
      select: { id: true, price: true, optionGroups: true, stationId: true, station: { select: { name: true } } },
    });
    const itemById = Object.fromEntries(menuItems.map((m) => [m.id, m]));

    const validatedLines: {
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
      selectedOptions: string | null;
      selectedOptionsSummary: string | null;
      optionPriceModifier: number;
    }[] = [];
    let computedTotal = 0;
    for (const i of items) {
      const menuItem = itemById[i.menuItemId];
      if (!menuItem) {
        return NextResponse.json({ error: "Invalid or unavailable item: " + i.menuItemId }, { status: 400 });
      }
      const realPrice = menuItem.price;
      const groups = parseOptionGroups(menuItem.optionGroups);
      const selected =
        i.selectedOptions && typeof i.selectedOptions === "object"
          ? i.selectedOptions
          : {};
      if (groups.length > 0 && !validateOptions(groups, selected)) {
        return NextResponse.json(
          { error: "Invalid or missing options for item: " + menuItem.id },
          { status: 400 }
        );
      }
      const optionModifier = computeOptionModifier(groups, selected);
      const qty = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(i.quantity)) || 1));
      const notes =
        i.notes != null && typeof i.notes === "string"
          ? i.notes.slice(0, MAX_NOTE_LENGTH).trim() || null
          : null;
      const selectedOptionsJson =
        Object.keys(selected).length > 0 ? JSON.stringify(selected) : null;
      const selectedOptionsSummary =
        groups.length > 0 && Object.keys(selected).length > 0
          ? optionsSummary(groups, selected)
          : null;
      validatedLines.push({
        menuItemId: i.menuItemId,
        quantity: qty,
        unitPrice: realPrice + optionModifier,
        notes,
        selectedOptions: selectedOptionsJson,
        selectedOptionsSummary,
        optionPriceModifier: optionModifier,
      });
      computedTotal += (realPrice + optionModifier) * qty;
    }

    if (computedTotal !== totalAmount) {
      return NextResponse.json(
        { error: "Total does not match items; please refresh the menu" },
        { status: 400 }
      );
    }

    const restaurantRow = await prisma.restaurant.findUnique({
      where: { id: table.restaurantId },
      select: {
        waiterRelayEnabled: true,
        onlinePaymentEnabled: true,
        payAtTableCardEnabled: true,
        payAtTableCashEnabled: true,
      },
    });
    if (!restaurantRow) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const useStripeCheckout = restaurantUsesStripeCheckout(restaurantRow);

    let paymentPreference: string | null = null;
    if (!useStripeCheckout) {
      const cardOk = restaurantRow.payAtTableCardEnabled === true;
      const cashOk = restaurantRow.payAtTableCashEnabled === true;
      if (!cardOk && !cashOk) {
        if (restaurantRow.onlinePaymentEnabled === true) {
          return NextResponse.json(
            {
              error:
                "Online payment is enabled but Stripe is not set up on this server. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL, or enable “Card at table” / “Cash” under Options.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            error:
              "This venue has no payment options enabled. The owner can fix this under Options → Guest payments.",
          },
          { status: 503 }
        );
      }
      if (cardOk && !cashOk) {
        paymentPreference = "card";
      } else if (!cardOk && cashOk) {
        paymentPreference = "cash";
      } else {
        const p = typeof prefRaw === "string" ? prefRaw.trim() : "";
        if (p !== "card" && p !== "cash") {
          return NextResponse.json(
            { error: "Choose how you will pay: card or cash." },
            { status: 400 }
          );
        }
        if (p === "card" && !cardOk) {
          return NextResponse.json({ error: "Card payment is not offered for this venue." }, { status: 400 });
        }
        if (p === "cash" && !cashOk) {
          return NextResponse.json({ error: "Cash payment is not offered for this venue." }, { status: 400 });
        }
        paymentPreference = p;
      }
    }

    const relayEnabled = restaurantRow.waiterRelayEnabled !== false;
    const waiterRelayAt =
      !relayEnabled || staffSkipsWaiterRelay ? new Date() : null;

    const order = await prisma.order.create({
      data: {
        tableId: table.id,
        restaurantId: table.restaurantId,
        totalAmount: computedTotal,
        status: "pending",
        paymentPreference,
        waiterRelayAt,
        items: {
          create: validatedLines.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
            selectedOptions: i.selectedOptions,
            selectedOptionsSummary: i.selectedOptionsSummary,
            optionPriceModifier: i.optionPriceModifier,
          })),
        },
      },
      include: { items: true },
    });

    let checkoutUrl: string | null = null;
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (useStripeCheckout && stripeKey && appUrl) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: order.items.map((i) => ({
            price_data: {
              currency: "eur",
              product_data: {
                name: `${i.quantity}× item`,
                description: `Order #${order.id.slice(-6)}`,
              },
              unit_amount: i.unitPrice, // already includes option modifier
            },
            quantity: i.quantity,
          })),
          success_url: `${appUrl}/m/${tableToken}/order/${order.id}?paid=1`,
          cancel_url: `${appUrl}/m/${tableToken}?cancel=1`,
          metadata: { orderId: order.id },
        });
        checkoutUrl = session.url;
        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id },
        });
      } catch {
        // Stripe error – leave order pending; do not mark paid
      }
    }

    // Pay at table (or demo): confirm for kitchen — same statuses as after successful Stripe webhook.
    if (!checkoutUrl && !useStripeCheckout) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "paid", paidAt: new Date() },
      });
    }

    const stationGroups = new Map<string, { station: string; items: typeof order.items }>();
    for (const line of order.items) {
      const mi = itemById[line.menuItemId];
      const stationName = mi?.station?.name ?? "Kitchen";
      const existing = stationGroups.get(stationName);
      if (existing) {
        existing.items.push(line);
      } else {
        stationGroups.set(stationName, { station: stationName, items: [line] });
      }
    }

    return NextResponse.json({
      orderId: order.id,
      checkoutUrl,
      stations: Array.from(stationGroups.values()),
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("waiterRelayAt") ||
      msg.includes("waiterRelayEnabled") ||
      msg.includes("paymentPreference") ||
      msg.includes("onlinePaymentEnabled") ||
      msg.includes("Unknown column") ||
      msg.includes("does not exist")
    ) {
      return NextResponse.json(
        {
          error:
            "Database is missing new columns. Stop the server, run: npx prisma db push && npx prisma generate — then start again.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
