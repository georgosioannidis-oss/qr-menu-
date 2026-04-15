"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { teamAccessSummary } from "@/lib/accessTypeLabels";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";
import {
  DASHBOARD_SECTION_IDS,
  SECTION_LABELS,
  emptyStaffPermissions,
  type StaffPermissionsMap,
} from "@/lib/staff-permissions";
import { InviteLinkModal } from "./InviteLinkModal";
import { InviteSignupLogModal } from "./InviteSignupLogModal";

export type StaffInviteRow = {
  id: string;
  role: string;
  permissions: unknown;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  /** Email that consumed this invite (set when they complete join). */
  usedByEmail: string | null;
  /** Full /join/{token} URL (for history & search; may be expired). */
  invitePageUrl: string;
  joinUrl: string | null;
};

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

/** Same string on server and client (avoids locale / TZ hydration mismatches). */
function fmtShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mon = UTC_MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}, ${hh}:${mm} UTC`;
}

export function OfficeStaffInvitesSection({
  initialInvites,
  inviteNameByEmail,
  embedded,
}: {
  initialInvites: StaffInviteRow[];
  /** Lowercase email → display name from current team list (best effort). */
  inviteNameByEmail: Record<string, string>;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);

  const [perm, setPerm] = useState<StaffPermissionsMap>(() => emptyStaffPermissions());
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyOwnerInvite, setBusyOwnerInvite] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [inviteLinkModalUrl, setInviteLinkModalUrl] = useState<string | null>(null);
  const [signupLogOpen, setSignupLogOpen] = useState(false);

  async function refresh() {
    const res = await fetch("/api/dashboard/staff-invites");
    const data = (await res.json()) as { invites?: StaffInviteRow[] };
    if (res.ok && data.invites) setInvites(data.invites);
    router.refresh();
  }

  function toggleSection(id: (typeof DASHBOARD_SECTION_IDS)[number]) {
    setPerm((p) => ({ ...p, [id]: !p[id] }));
  }

  async function generateCustom() {
    setBusyCreate(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/staff-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: "custom", permissions: perm }),
      });
      const data = (await res.json()) as { joinUrl?: string; error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not create invite.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      if (data.joinUrl) {
        setInviteLinkModalUrl(data.joinUrl);
        toast.success("Invite created");
      }
      await refresh();
    } finally {
      setBusyCreate(false);
    }
  }

  async function generateOwnerInvite() {
    if (
      !confirmDestructiveAction(
        "Create an invite for a full owner (co-owner)?",
        "They will have the same control as you: billing, deleting the venue, team access, and all settings. Only share this with someone you trust."
      )
    )
      return;

    setBusyOwnerInvite(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/staff-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantOwnerAccess: true }),
      });
      const data = (await res.json()) as { joinUrl?: string; error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not create invite.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      if (data.joinUrl) {
        setInviteLinkModalUrl(data.joinUrl);
        toast.success("Owner invite created");
      }
      await refresh();
    } finally {
      setBusyOwnerInvite(false);
    }
  }

  async function revoke(id: string) {
    if (
      !confirmDestructiveAction(
        "Revoke this invite?",
        "Anyone with the link will no longer be able to use it."
      )
    )
      return;
    setRevokingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/staff-invites/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not revoke.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setMsg({ type: "ok", text: "Invite revoked." });
      toast.success("Invite revoked");
      await refresh();
    } finally {
      setRevokingId(null);
    }
  }

  const pending = invites.filter((i) => i.joinUrl);
  const anyBusy = busyCreate || busyOwnerInvite || revokingId !== null;

  const frame =
    embedded === true
      ? "rounded-xl border border-border/80 bg-ink/[0.02] p-4 shadow-none"
      : "rounded-2xl border border-border bg-card p-6 shadow-sm";

  return (
    <section className={frame}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Invites</h2>
      <p className="mt-1 text-xs text-ink-muted sm:text-sm">
        One-time signup links only—then normal <strong className="font-medium text-ink">Team</strong> login. Prep tablets
        use slug login.
      </p>

      <fieldset className="mt-4 space-y-2 rounded-xl border border-border bg-ink/[0.02] p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Access</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DASHBOARD_SECTION_IDS.map((id) => (
            <li key={id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:bg-ink/[0.03]">
                <input
                  type="checkbox"
                  checked={perm[id]}
                  onChange={() => toggleSection(id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
                />
                <span className="break-words text-sm font-medium leading-snug text-ink">
                  {SECTION_LABELS[id]}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setPerm(() => {
              const next = emptyStaffPermissions();
              for (const k of DASHBOARD_SECTION_IDS) next[k] = true;
              return next;
            })}
          >
            Select all
          </button>
          <span className="text-xs text-ink-muted">·</span>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => {
              if (
                !confirmDestructiveAction(
                  "Clear all selected access for this invite?",
                  "You can select sections again before creating a link."
                )
              )
                return;
              setPerm(emptyStaffPermissions());
            }}
          >
            Clear
          </button>
        </div>
      </fieldset>

      <button
        type="button"
        disabled={anyBusy}
        onClick={() => void generateCustom()}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {busyCreate ? (
          <>
            <Spinner className="h-4 w-4 border-white border-t-transparent" />
            Creating…
          </>
        ) : (
          "Create team invite link"
        )}
      </button>

      <div className="mt-6 rounded-xl border border-border bg-ink/[0.03] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink">
          Full owner (co-owner)
        </p>
        <p className="mt-1 text-xs text-ink-muted">Owner-tab signup. You&apos;ll confirm before it&apos;s created.</p>
        <button
          type="button"
          disabled={anyBusy}
          onClick={() => void generateOwnerInvite()}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/[0.03] disabled:opacity-50"
        >
          {busyOwnerInvite ? (
            <>
              <Spinner className="h-4 w-4 border-ink border-t-transparent" />
              Creating…
            </>
          ) : (
            "Create owner invite link"
          )}
        </button>
      </div>

      {msg ? (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            msg.type === "err" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      {pending.length > 0 ? (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Active</p>
          <ul className="space-y-2">
            {pending.map((i) => (
              <li
                key={i.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-ink/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-ink">{teamAccessSummary(i.role, i.permissions)}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">Expires {fmtShort(i.expiresAt)} UTC</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={anyBusy || !i.joinUrl}
                    onClick={() => i.joinUrl && setInviteLinkModalUrl(i.joinUrl)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    disabled={anyBusy}
                    onClick={() => void revoke(i.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    {revokingId === i.id ? (
                      <Spinner className="h-3.5 w-3.5 border-red-800 border-t-transparent" />
                    ) : null}
                    {revokingId === i.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">None active.</p>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={invites.length === 0}
          onClick={() => setSignupLogOpen(true)}
          title={invites.length === 0 ? "Create an invite first" : "View all signup links"}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Signup log
          {invites.length > 0 ? (
            <span className="ml-1.5 tabular-nums font-normal text-ink-muted">({invites.length})</span>
          ) : null}
        </button>
      </div>

      {signupLogOpen && invites.length > 0 ? (
        <InviteSignupLogModal
          invites={invites}
          inviteNameByEmail={inviteNameByEmail}
          onClose={() => setSignupLogOpen(false)}
        />
      ) : null}

      {inviteLinkModalUrl ? (
        <InviteLinkModal url={inviteLinkModalUrl} onClose={() => setInviteLinkModalUrl(null)} />
      ) : null}
    </section>
  );
}
