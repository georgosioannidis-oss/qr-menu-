"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

/**
 * Orders dashboard: pause new orders from guest QR menus (kitchen overload).
 */
export function GuestOrderingPauseCard() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/restaurant/guest-ordering-pause");
      if (!res.ok) throw new Error("Could not load");
      const data = (await res.json()) as { paused?: boolean };
      setPaused(data.paused === true);
    } catch {
      setPaused(null);
      toast.error("Could not load QR ordering status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/restaurant/guest-ordering-pause", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: next }),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = "Could not update";
        try {
          const d = JSON.parse(t) as { error?: string };
          if (typeof d.error === "string") msg = d.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as { paused?: boolean };
      setPaused(data.paused === true);
      toast.success(data.paused ? "Guest menus are paused — no new QR orders." : "Guest menus are accepting orders again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-4 py-4 text-sm text-ink-muted">
        <Spinner className="h-4 w-4 border-primary border-t-transparent" />
        Loading ordering controls…
      </div>
    );
  }

  if (paused === null) {
    return null;
  }

  return (
    <div
      className={`mb-6 rounded-2xl border px-4 py-4 shadow-sm ${
        paused
          ? "border-amber-400/60 bg-amber-500/10 group-data-[theme=dark]/dashboard:border-amber-500/45 group-data-[theme=dark]/dashboard:bg-amber-500/15"
          : "border-border bg-card/80"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-ink">Guest QR ordering</p>
          <p className="mt-1 text-sm text-ink-muted leading-relaxed">
            {paused
              ? "Guests scanning table QRs see a clear “not taking orders” screen. Staff can still use the dashboard. Turn this off when the kitchen can take more tickets."
              : "When the queue is too deep, pause here to stop new orders from guest menus. Existing links keep working; only checkout is blocked."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {paused ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggle(false)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {saving ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
              Resume guest orders
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggle(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-amber-500/70 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-50"
            >
              {saving ? <Spinner className="h-4 w-4 border-amber-900 border-t-transparent" /> : null}
              Pause new QR orders
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
