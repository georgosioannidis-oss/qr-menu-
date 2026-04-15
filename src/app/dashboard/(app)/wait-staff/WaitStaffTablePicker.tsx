"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

type TableRow = {
  id: string;
  name: string;
  token: string;
  sortOrder: number;
  waiterCalledAt: string | null;
};

type SectionRow = {
  id: string;
  name: string;
  sortOrder: number;
  tables: TableRow[];
};

export function WaitStaffTablePicker() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/wait-staff/tables");
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        setSections([]);
        return;
      }
      if (res.status === 403) {
        setError("This account cannot load tables for ordering.");
        setSections([]);
        return;
      }
      const text = await res.text();
      if (!res.ok) {
        let msg = `Could not load tables (HTTP ${res.status})`;
        try {
          const d = JSON.parse(text) as { error?: string };
          if (typeof d.error === "string") msg = d.error;
        } catch {
          if (text && text.length < 400) msg = `${msg}. ${text.trim()}`;
        }
        setError(msg);
        setSections([]);
        return;
      }
      const data = JSON.parse(text) as { sections?: SectionRow[] };
      setSections(Array.isArray(data.sections) ? data.sections : []);
    } catch {
      setError("Could not load tables.");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const clearCall = async (tableId: string) => {
    if (
      !confirmDestructiveAction(
        "Clear the waiter call for this table?",
        "Use this only after you have visited the table. The guest can tap “Call waiter” again if needed."
      )
    )
      return;
    setClearingId(tableId);
    try {
      const res = await fetch(`/api/dashboard/wait-staff/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearWaiterCall: true }),
      });
      const text = await res.text();
      let d: { error?: string } = {};
      try {
        if (text) d = JSON.parse(text);
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        toast.error(d.error ?? "Could not clear call");
        return;
      }
      await load();
    } catch {
      toast.error("Request failed");
    } finally {
      setClearingId(null);
    }
  };

  const tableCount = sections.reduce((n, s) => n + s.tables.length, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Tables</h2>
      <p className="mt-1 text-sm text-ink-muted">
        A <strong className="text-violet-700 dark:text-violet-300">purple</strong> table means a guest tapped{" "}
        <strong>Call waiter</strong>. Tap the bar on that table after you visit to clear it. Use the table name link to
        open the guest menu in a new tab.
      </p>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading tables…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>
      ) : tableCount === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-ink-muted">
          No tables yet. An owner can add them under <strong className="text-ink">Tables</strong>.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((section) =>
            section.tables.length === 0 ? null : (
              <div key={section.id}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{section.name}</h3>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {section.tables.map((t) => {
                    const called = t.waiterCalledAt != null;
                    return (
                      <li key={t.id} className="flex flex-col gap-0">
                        {called ? (
                          <button
                            type="button"
                            onClick={() => void clearCall(t.id)}
                            disabled={clearingId === t.id}
                            className="flex min-h-[40px] w-full items-center justify-center rounded-t-xl bg-violet-600 px-2 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
                          >
                            {clearingId === t.id ? (
                              <>
                                <Spinner className="mr-2 h-3.5 w-3.5 border-white border-t-transparent" label="" />
                                Clearing…
                              </>
                            ) : (
                              "Tap after visit — clear call"
                            )}
                          </button>
                        ) : null}
                        <Link
                          href={`/m/${t.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex min-h-[48px] items-center justify-center border-2 px-3 py-3 text-center text-sm font-semibold shadow-sm transition-colors ${
                            called
                              ? "rounded-b-xl rounded-t-none border-violet-500 bg-violet-100/80 text-violet-950 ring-1 ring-violet-400/30 hover:bg-violet-100 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/50"
                              : "rounded-xl border-border bg-card text-ink hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          {t.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
