"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function OfficeStaffMenuAccess({
  initialValue,
  embedded,
}: {
  initialValue: boolean;
  /** Lighter frame when shown inside the team popup. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [staffMayEdit, setStaffMayEdit] = useState(initialValue);
  useEffect(() => {
    setStaffMayEdit(initialValue);
  }, [initialValue]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(next: boolean) {
    if (next === staffMayEdit) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/dashboard/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffMayEditMenuTables: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const err = typeof data.error === "string" ? data.error : "Could not save.";
        setErr(err);
        toast.error(err);
        return;
      }
      setStaffMayEdit(next);
      toast.success("Saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const frame =
    embedded === true
      ? "rounded-xl border border-border/80 bg-ink/[0.02] p-4 shadow-none"
      : "rounded-2xl border border-border bg-card p-6 shadow-sm";

  return (
    <section className={frame}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Menu &amp; tables</h2>
      <p className="mt-1 text-ink-muted text-sm">Who can edit Menu and Tables (staff always keeps order screens).</p>

      <div
        className="mt-4 grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Who can edit menu and tables"
      >
        <OptionCard
          selected={!staffMayEdit}
          disabled={saving}
          onSelect={() => void save(false)}
          title="Owners only"
        />
        <OptionCard
          selected={staffMayEdit}
          disabled={saving}
          onSelect={() => void save(true)}
          title="Owners + staff"
        />
      </div>

      {saving ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span
            className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
            aria-hidden
          />
          Saving…
        </p>
      ) : null}
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
    </section>
  );
}

function OptionCard({
  selected,
  disabled,
  onSelect,
  title,
}: {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "group relative flex w-full flex-col rounded-xl border-2 p-4 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
        selected
          ? "border-primary bg-primary/[0.08] shadow-sm"
          : "border-border bg-card hover:border-ink-muted/40 hover:bg-ink/[0.02]",
        disabled ? "pointer-events-none opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-white"
              : "border-ink-muted/35 bg-transparent group-hover:border-ink-muted/55",
          ].join(" ")}
          aria-hidden
        >
          {selected ? (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 6l2.25 2.25L9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{title}</span>
        </span>
      </span>
    </button>
  );
}
