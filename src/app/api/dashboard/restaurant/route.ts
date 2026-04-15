import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDashboardServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import {
  requireBrandingApi,
  requireManagementApi,
  requireRestaurantReadApi,
} from "@/lib/require-owner-api";
import { isValidHex } from "@/lib/theme";

export async function GET() {
  try {
    const session = await getDashboardServerSession();
    const forbidden = await requireRestaurantReadApi(session);
    if (forbidden) return forbidden;
    const restaurantId = session!.user.restaurantId!;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        colorMode: true,
        waiterRelayEnabled: true,
        staffMayEditMenuTables: true,
        navLabelOrdersQueue: true,
        navLabelGuestOrders: true,
        onlinePaymentEnabled: true,
        payAtTableCardEnabled: true,
        payAtTableCashEnabled: true,
        prepTimeEstimateMinutes: true,
        printAgentToken: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { printAgentToken, ...rest } = restaurant;
    return NextResponse.json({
      ...rest,
      hasPrintAgentToken: Boolean(printAgentToken),
    });
  } catch (e) {
    console.error("GET /api/dashboard/restaurant:", e);
    const message = e instanceof Error ? e.message : "Server error";
    const hint = message.includes("column") || message.includes("Unknown column")
      ? " Run: npx prisma db push"
      : "";
    return NextResponse.json(
      { error: message + hint },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  let body: {
    name?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    colorMode?: string | null;
    waiterRelayEnabled?: boolean;
    staffMayEditMenuTables?: boolean;
    navLabelOrdersQueue?: string | null;
    navLabelGuestOrders?: string | null;
    onlinePaymentEnabled?: boolean;
    payAtTableCardEnabled?: boolean;
    payAtTableCashEnabled?: boolean;
    prepTimeEstimateMinutes?: number | null | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const session = await getDashboardServerSession(req);
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const restaurantId = session.user.restaurantId;

    const before = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { waiterRelayEnabled: true },
    });

    const data: {
      name?: string;
      logoUrl?: string | null;
      primaryColor?: string | null;
      colorMode?: string | null;
      waiterRelayEnabled?: boolean;
      staffMayEditMenuTables?: boolean;
      navLabelOrdersQueue?: string | null;
      navLabelGuestOrders?: string | null;
      onlinePaymentEnabled?: boolean;
      payAtTableCardEnabled?: boolean;
      payAtTableCashEnabled?: boolean;
      prepTimeEstimateMinutes?: number | null;
    } = {};

    if (body.logoUrl !== undefined) {
      const url = body.logoUrl === "" || body.logoUrl == null ? null : String(body.logoUrl).trim();
      data.logoUrl = url || null;
    }

    if (body.primaryColor !== undefined) {
      const color = body.primaryColor === "" || body.primaryColor == null ? null : String(body.primaryColor).trim();
      if (color !== null && !isValidHex(color)) {
        return NextResponse.json({ error: "primaryColor must be a valid hex (e.g. #C15C2A)" }, { status: 400 });
      }
      data.primaryColor = color || null;
    }

    if (body.colorMode !== undefined) {
      const mode = body.colorMode === "" || body.colorMode == null ? null : String(body.colorMode).trim();
      data.colorMode = mode === "dark" || mode === "light" ? mode : null;
    }

    if (body.name !== undefined && String(body.name).trim()) {
      data.name = String(body.name).trim();
    }

    if (body.waiterRelayEnabled !== undefined) {
      data.waiterRelayEnabled = Boolean(body.waiterRelayEnabled);
    }

    if (body.staffMayEditMenuTables !== undefined) {
      data.staffMayEditMenuTables = Boolean(body.staffMayEditMenuTables);
    }

    if (body.navLabelOrdersQueue !== undefined) {
      const v =
        body.navLabelOrdersQueue === "" || body.navLabelOrdersQueue == null
          ? null
          : String(body.navLabelOrdersQueue).trim().slice(0, 32) || null;
      data.navLabelOrdersQueue = v;
    }

    if (body.navLabelGuestOrders !== undefined) {
      const v =
        body.navLabelGuestOrders === "" || body.navLabelGuestOrders == null
          ? null
          : String(body.navLabelGuestOrders).trim().slice(0, 32) || null;
      data.navLabelGuestOrders = v;
    }

    if (body.onlinePaymentEnabled !== undefined) {
      data.onlinePaymentEnabled = Boolean(body.onlinePaymentEnabled);
    }
    if (body.payAtTableCardEnabled !== undefined) {
      data.payAtTableCardEnabled = Boolean(body.payAtTableCardEnabled);
    }
    if (body.payAtTableCashEnabled !== undefined) {
      data.payAtTableCashEnabled = Boolean(body.payAtTableCashEnabled);
    }

    if (body.prepTimeEstimateMinutes !== undefined) {
      const raw = body.prepTimeEstimateMinutes;
      if (raw === null || raw === "" || (typeof raw === "string" && raw.trim() === "")) {
        data.prepTimeEstimateMinutes = null;
      } else {
        const n = typeof raw === "number" ? raw : Number(typeof raw === "string" ? raw.trim() : raw);
        if (!Number.isFinite(n) || n < 1 || n > 300) {
          return NextResponse.json(
            { error: "prepTimeEstimateMinutes must be between 1 and 300, or null to clear." },
            { status: 400 }
          );
        }
        data.prepTimeEstimateMinutes = Math.round(n);
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const paymentKeys: (keyof typeof data)[] = [
      "onlinePaymentEnabled",
      "payAtTableCardEnabled",
      "payAtTableCashEnabled",
    ];
    if (paymentKeys.some((k) => data[k] !== undefined)) {
      const current = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          onlinePaymentEnabled: true,
          payAtTableCardEnabled: true,
          payAtTableCashEnabled: true,
        },
      });
      const next = {
        onlinePaymentEnabled:
          data.onlinePaymentEnabled !== undefined
            ? data.onlinePaymentEnabled
            : Boolean(current?.onlinePaymentEnabled),
        payAtTableCardEnabled:
          data.payAtTableCardEnabled !== undefined
            ? data.payAtTableCardEnabled
            : Boolean(current?.payAtTableCardEnabled),
        payAtTableCashEnabled:
          data.payAtTableCashEnabled !== undefined
            ? data.payAtTableCashEnabled
            : Boolean(current?.payAtTableCashEnabled),
      };
      if (
        !next.onlinePaymentEnabled &&
        !next.payAtTableCardEnabled &&
        !next.payAtTableCashEnabled
      ) {
        return NextResponse.json(
          {
            error:
              "Enable at least one payment option: pay online (card), pay at table with card, and/or cash.",
          },
          { status: 400 }
        );
      }
    }

    if (data.staffMayEditMenuTables !== undefined) {
      const f = await requireManagementApi(session);
      if (f) return f;
    }
    const { staffMayEditMenuTables: _skip, ...dataExceptStaffPolicy } = data;
    if (Object.keys(dataExceptStaffPolicy).length > 0) {
      const f = await requireBrandingApi(session);
      if (f) return f;
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        colorMode: true,
        waiterRelayEnabled: true,
        staffMayEditMenuTables: true,
        navLabelOrdersQueue: true,
        navLabelGuestOrders: true,
        onlinePaymentEnabled: true,
        payAtTableCardEnabled: true,
        payAtTableCashEnabled: true,
        prepTimeEstimateMinutes: true,
      },
    });

    const wasRelay = before?.waiterRelayEnabled === true;
    const nowRelay = restaurant.waiterRelayEnabled === true;
    if (wasRelay && !nowRelay) {
      await prisma.order.updateMany({
        where: {
          restaurantId,
          waiterRelayAt: null,
          status: { notIn: ["delivered", "declined"] },
        },
        data: { waiterRelayAt: new Date() },
      });
    }

    revalidatePath("/dashboard", "layout");

    return NextResponse.json(restaurant);
  } catch (e) {
    console.error("PATCH /api/dashboard/restaurant:", e);
    const message = e instanceof Error ? e.message : "Server error";
    const hint =
      message.includes("column") || message.includes("Unknown column") || message.includes("does not exist")
        ? " If the project was updated recently, run: npx prisma db push"
        : "";
    return NextResponse.json({ error: message + hint }, { status: 500 });
  }
}
