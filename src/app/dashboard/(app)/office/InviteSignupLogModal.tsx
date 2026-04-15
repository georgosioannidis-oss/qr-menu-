"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { teamAccessSummary } from "@/lib/accessTypeLabels";
import type { StaffInviteRow } from "./OfficeStaffInvitesSection";

const UTC_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function fmtShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mon = UTC_MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}, ${hh}:${mm} UTC`;
}

export function InviteSignupLogModal({
  invites,
  inviteNameByEmail,
  onClose,
}: {
  invites: StaffInviteRow[];
  inviteNameByEmail: Record<string, string>;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const sorted = useMemo(
    () => [...invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invites]
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((inv) => {
      const email = inv.usedByEmail?.toLowerCase() ?? "";
      const name =
        (inv.usedByEmail && inviteNameByEmail[inv.usedByEmail.trim().toLowerCase()])?.toLowerCase() ??
        "";
      const access = teamAccessSummary(inv.role, inv.permissions).toLowerCase();
      const url = inv.invitePageUrl.toLowerCase();
      const dates = `${fmtShort(inv.createdAt)} ${fmtShort(inv.expiresAt)} ${inv.usedAt ? fmtShort(inv.usedAt) : ""}`.toLowerCase();
      const status = inv.joinUrl ? "active unused pending" : inv.usedAt ? "used" : "expired revoked";
      const hay = `${email} ${name} ${access} ${url} ${dates} ${status}`;
      return hay.includes(needle);
    });
  }, [sorted, q, inviteNameByEmail]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-log-title"
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-h-[min(88dvh,800px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h2 id="signup-log-title" className="text-lg font-bold text-ink">
            Signup link log
          </h2>
          <label className="mt-3 block text-xs font-semibold text-ink-muted" htmlFor="signup-log-search">
            Search
          </label>
          <input
            id="signup-log-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, status…"
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-border bg-ink/[0.03] px-3 py-2.5 text-sm text-ink outline-none ring-primary placeholder:text-ink-muted/70 focus:ring-2"
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            {filtered.length} of {invites.length}
          </p>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <li className="p-6 text-center text-sm text-ink-muted">No matches.</li>
          ) : (
            filtered.map((inv) => {
              const email = inv.usedByEmail;
              const emKey = email?.trim().toLowerCase() ?? "";
              const who = emKey ? inviteNameByEmail[emKey] ?? null : null;
              const statusLabel = inv.joinUrl
                ? "Waiting for signup"
                : inv.usedAt
                  ? "Used"
                  : "Expired / revoked";
              return (
                <li key={inv.id} className="dashboard-copy p-4 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          inv.joinUrl
                            ? "bg-primary/12 text-primary"
                            : inv.usedAt
                              ? "bg-ink/10 text-ink-muted"
                              : "bg-amber-500/15 text-amber-900 group-data-[theme=dark]/dashboard:text-amber-100"
                        }`}
                      >
                        {statusLabel}
                      </span>
                      {who ? <p className="font-semibold text-ink">{who}</p> : null}
                      {!who && email ? (
                        <p className="text-xs text-ink-muted">Name not on file</p>
                      ) : null}
                      <p className="break-all font-mono text-xs text-ink-muted">
                        <span className="font-sans font-medium text-ink">Email: </span>
                        {email ?? "—"}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {teamAccessSummary(inv.role, inv.permissions)}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {fmtShort(inv.createdAt)}
                        {inv.usedAt ? ` · Used ${fmtShort(inv.usedAt)}` : ""}
                        {!inv.joinUrl && !inv.usedAt ? ` · Expires ${fmtShort(inv.expiresAt)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyUrl(inv.invitePageUrl)}
                      className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5"
                    >
                      Copy
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="shrink-0 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-ink hover:bg-ink/5 sm:w-auto sm:px-8"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
