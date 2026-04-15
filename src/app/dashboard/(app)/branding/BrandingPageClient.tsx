"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandingForm } from "./BrandingForm";
import { PrintAgentSection } from "./PrintAgentSection";

export function BrandingPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    colorMode: string | null;
    waiterRelayEnabled?: boolean;
    hasPrintAgentToken?: boolean;
    navLabelOrdersQueue?: string | null;
    navLabelGuestOrders?: string | null;
    onlinePaymentEnabled?: boolean;
    payAtTableCardEnabled?: boolean;
    payAtTableCashEnabled?: boolean;
    prepTimeEstimateMinutes?: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard/restaurant");
        const text = await res.text();
        let json: {
          error?: string;
          name?: string;
          logoUrl?: string | null;
          primaryColor?: string | null;
          colorMode?: string | null;
          waiterRelayEnabled?: boolean;
          hasPrintAgentToken?: boolean;
          navLabelOrdersQueue?: string | null;
          navLabelGuestOrders?: string | null;
          onlinePaymentEnabled?: boolean;
          payAtTableCardEnabled?: boolean;
          payAtTableCashEnabled?: boolean;
          prepTimeEstimateMinutes?: number | null;
        } = {};
        try {
          if (text) json = JSON.parse(text);
        } catch {
          if (!cancelled) setError("Invalid response from server.");
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          if (!cancelled) router.replace("/dashboard/login");
          return;
        }
        if (!res.ok) {
          const msg =
            json.error ||
            (res.status === 404 ? "Restaurant not found. Try logging out and back in." : "Could not load options.");
          if (!cancelled) setError(msg);
          return;
        }
        if (!cancelled) {
          setData({
            name: json.name ?? "",
            logoUrl: json.logoUrl ?? null,
            primaryColor: json.primaryColor ?? null,
            colorMode: json.colorMode ?? null,
            waiterRelayEnabled: json.waiterRelayEnabled === true,
            hasPrintAgentToken: json.hasPrintAgentToken === true,
            navLabelOrdersQueue: json.navLabelOrdersQueue ?? null,
            navLabelGuestOrders: json.navLabelGuestOrders ?? null,
            onlinePaymentEnabled: json.onlinePaymentEnabled === true,
            payAtTableCardEnabled: json.payAtTableCardEnabled !== false,
            payAtTableCashEnabled: json.payAtTableCashEnabled !== false,
            prepTimeEstimateMinutes:
              typeof json.prepTimeEstimateMinutes === "number" ? json.prepTimeEstimateMinutes : null,
          });
        }
      } catch (e) {
        if (!cancelled) setError("Could not load options. Check the server is running.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-10">
      <BrandingForm
        initialName={data.name}
        initialLogoUrl={data.logoUrl ?? ""}
        initialPrimaryColor={data.primaryColor ?? ""}
        initialColorMode={data.colorMode ?? undefined}
        initialWaiterRelayEnabled={data.waiterRelayEnabled}
        initialNavLabelOrdersQueue={data.navLabelOrdersQueue ?? ""}
        initialNavLabelGuestOrders={data.navLabelGuestOrders ?? ""}
        initialOnlinePaymentEnabled={data.onlinePaymentEnabled}
        initialPayAtTableCardEnabled={data.payAtTableCardEnabled}
        initialPayAtTableCashEnabled={data.payAtTableCashEnabled}
        initialPrepTimeEstimateMinutes={data.prepTimeEstimateMinutes ?? null}
      />
      <PrintAgentSection hasPrintAgentToken={data.hasPrintAgentToken === true} />
    </div>
  );
}
