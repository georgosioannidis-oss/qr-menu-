"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accessTypeCompactSummary, teamAccessSummary } from "@/lib/accessTypeLabels";
import {
  FLOOR_ROLE,
  KITCHEN_ROLE,
  OWNER_ROLE,
  STAFF_GRANULAR_ROLE,
  WAITER_ROLE,
} from "@/lib/dashboard-roles";
import {
  DASHBOARD_SECTION_IDS,
  SECTION_LABELS,
  emptyStaffPermissions,
  parseStaffPermissions,
  staffPermissionsHasAny,
  type StaffPermissionsMap,
} from "@/lib/staff-permissions";
import { isKitchenDeviceEmail } from "@/lib/kitchen-device-user";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";
import { MemberEditModal, type MemberProfilePayload } from "./MemberEditModal";

export type OfficeEmployeeRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  disabled: boolean;
  title: string | null;
  permissions: unknown;
  /** ISO timestamp — when the account was created (join date). */
  createdAt?: string;
};

const STANDARD_ACCESS = [OWNER_ROLE, KITCHEN_ROLE, WAITER_ROLE, FLOOR_ROLE] as const;

const ACCESS_PICKER_SECTIONS: {
  id: "owner_tab" | "team_tab";
  heading: string;
  roles: readonly (typeof STANDARD_ACCESS)[number][];
}[] = [
  { id: "owner_tab", heading: "Owner tab", roles: [OWNER_ROLE] },
  { id: "team_tab", heading: "Team tab", roles: [WAITER_ROLE, KITCHEN_ROLE, FLOOR_ROLE] },
];

const ACCESS_HINT: Record<(typeof STANDARD_ACCESS)[number], string> = {
  [OWNER_ROLE]: "Office, menu, team.",
  [WAITER_ROLE]: "Waiter tab.",
  [KITCHEN_ROLE]: "Prep list.",
  [FLOOR_ROLE]: "Waiter + prep.",
};

function isKnownAccessRole(role: string): boolean {
  return (
    (STANDARD_ACCESS as readonly string[]).includes(role) || role === STAFF_GRANULAR_ROLE
  );
}

function formatJoinedDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function displayLogin(row: OfficeEmployeeRow) {
  if (isKitchenDeviceEmail(row.email)) {
    return "Legacy auto-account (remove if unused)";
  }
  return row.email;
}

function personPrimarySecondary(row: OfficeEmployeeRow): { primary: string; secondary: string | null } {
  if (isKitchenDeviceEmail(row.email)) {
    return { primary: displayLogin(row), secondary: null };
  }
  const fn = row.firstName?.trim() ?? "";
  const ln = row.lastName?.trim() ?? "";
  const name = [fn, ln].filter(Boolean).join(" ");
  if (name) return { primary: name, secondary: row.email };
  return { primary: row.email, secondary: null };
}

function AccessPickerSubtitle({ row }: { row: OfficeEmployeeRow }) {
  const ps = personPrimarySecondary(row);
  return (
    <p
      className="mt-0.5 line-clamp-2 break-words text-xs text-ink-muted"
      title={ps.secondary ?? ps.primary}
    >
      {ps.primary}
      {ps.secondary ? ` · ${ps.secondary}` : ""}
    </p>
  );
}

export function OfficeEmployeesSection({
  initialUsers,
  currentUserId,
  embedded,
}: {
  initialUsers: OfficeEmployeeRow[];
  currentUserId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [accessPickerId, setAccessPickerId] = useState<string | null>(null);
  const [accessPickerMode, setAccessPickerMode] = useState<"roles" | "custom">("roles");
  const [customPermDraft, setCustomPermDraft] = useState<StaffPermissionsMap>(() =>
    emptyStaffPermissions()
  );
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pickerRow = accessPickerId ? users.find((u) => u.id === accessPickerId) : undefined;
  const editRow = editMemberId ? users.find((u) => u.id === editMemberId) : undefined;
  const deleteRow = deleteConfirmId ? users.find((u) => u.id === deleteConfirmId) : undefined;

  useEffect(() => {
    if (editMemberId && !users.some((u) => u.id === editMemberId)) {
      setEditMemberId(null);
    }
  }, [editMemberId, users]);

  useEffect(() => {
    if (deleteConfirmId && !users.some((u) => u.id === deleteConfirmId)) {
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, users]);

  useEffect(() => {
    if (!accessPickerId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAccessPickerId(null);
        setAccessPickerMode("roles");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accessPickerId]);

  useEffect(() => {
    if (accessPickerId) {
      setAccessPickerMode("roles");
    }
  }, [accessPickerId]);

  useEffect(() => {
    if (!accessPickerId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [accessPickerId]);

  async function refresh() {
    const usersRes = await fetch("/api/dashboard/restaurant-users");
    const usersData = (await usersRes.json()) as { users?: OfficeEmployeeRow[] };
    if (usersRes.ok && usersData.users) setUsers(usersData.users);
    router.refresh();
  }

  /** @returns whether the role was updated (API ok and not cancelled). */
  async function changeAccess(id: string, newRole: string, previousRole: string): Promise<boolean> {
    if (newRole === previousRole) return true;

    const wasTeamTabOnly =
      previousRole === KITCHEN_ROLE ||
      previousRole === WAITER_ROLE ||
      previousRole === FLOOR_ROLE ||
      previousRole === STAFF_GRANULAR_ROLE;
    const wasOwnerSide = !wasTeamTabOnly;
    const nowTeamTabOnly =
      newRole === KITCHEN_ROLE ||
      newRole === WAITER_ROLE ||
      newRole === FLOOR_ROLE ||
      newRole === STAFF_GRANULAR_ROLE;
    if (wasOwnerSide && nowTeamTabOnly) {
      if (
        !confirmDestructiveAction(
          "This person will lose owner-only areas.",
          "They will no longer have Office, Options, or the full overview until you grant owner access again."
        )
      )
        return false;
    }

    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/restaurant-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not update access.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return false;
      }
      setMsg({ type: "ok", text: "Access updated." });
      toast.success("Access updated");
      await refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function saveMemberProfile(id: string, p: MemberProfilePayload) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/restaurant-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title || null,
          firstName: p.firstName || null,
          lastName: p.lastName || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not save.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setMsg({ type: "ok", text: "Profile saved." });
      toast.success("Profile saved");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function setDisabled(id: string, disabled: boolean) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/restaurant-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not update.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setMsg({ type: "ok", text: disabled ? "Account disabled." : "Account enabled." });
      toast.success(disabled ? "Account disabled" : "Account enabled");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: string) {
    setDeleteConfirmId(null);
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/restaurant-users/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not remove.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setMsg({ type: "ok", text: "Account removed." });
      toast.success("Account removed");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function pickAccessFromModal(userId: string, newRole: string, previousRole: string) {
    if (newRole === OWNER_ROLE && previousRole !== OWNER_ROLE) {
      if (
        !confirmDestructiveAction(
          "Grant full owner access?",
          "They can manage billing, invite co-owners, delete the venue, and change all settings."
        )
      )
        return;
    }
    const ok = await changeAccess(userId, newRole, previousRole);
    if (ok) {
      setAccessPickerId(null);
      setAccessPickerMode("roles");
    }
  }

  function openCustomPicker() {
    if (!pickerRow) return;
    setCustomPermDraft(parseStaffPermissions(pickerRow.permissions) ?? emptyStaffPermissions());
    setAccessPickerMode("custom");
  }

  async function saveCustomAccess() {
    if (!pickerRow) return;
    if (!staffPermissionsHasAny(customPermDraft)) {
      toast.error("Pick at least one dashboard area.");
      return;
    }
    if (pickerRow.role === OWNER_ROLE) {
      if (
        !confirmDestructiveAction(
          "This person will lose full owner access.",
          "They will only see the dashboard areas you checked in custom access."
        )
      )
        return;
    }

    setBusyId(pickerRow.id);
    setMsg(null);
    try {
      const body =
        pickerRow.role === STAFF_GRANULAR_ROLE
          ? { permissions: customPermDraft }
          : { role: STAFF_GRANULAR_ROLE, permissions: customPermDraft };
      const res = await fetch(`/api/dashboard/restaurant-users/${pickerRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const err = data.error ?? "Could not update access.";
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setMsg({ type: "ok", text: "Access updated." });
      toast.success("Access updated");
      setAccessPickerId(null);
      setAccessPickerMode("roles");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const frame =
    embedded === true
      ? "rounded-xl border border-border/80 bg-ink/[0.02] p-4 shadow-none"
      : "rounded-2xl border border-border bg-card p-6 shadow-sm";

  return (
    <section className={frame}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Team</h2>
      <p className="mt-1 text-wrap-pretty text-xs leading-relaxed text-ink-muted sm:text-sm">
        Names show in the dashboard header after sign-in. Full invite history: <strong className="font-semibold text-ink">Invites → Signup log</strong>.
      </p>

      {msg ? (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            msg.type === "err"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {users.map((row) => {
          const self = row.id === currentUserId;
          const busy = busyId === row.id;
          const { primary, secondary } = personPrimarySecondary(row);
          const kitchen = isKitchenDeviceEmail(row.email);
          const accessText = kitchen ? "Legacy sign-in removed — delete or replace" : teamAccessSummary(row.role, row.permissions);
          return (
            <div
              key={row.id}
              className={`rounded-xl border border-border bg-ink/[0.02] px-4 py-3 shadow-sm ${
                row.disabled ? "opacity-[0.72]" : ""
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words text-lg font-semibold text-ink">{primary}</span>
                    {self ? (
                      <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        You
                      </span>
                    ) : null}
                    {row.disabled ? (
                      <span className="rounded-md bg-ink/10 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                        Cannot sign in
                      </span>
                    ) : (
                      <span className="rounded-md bg-green-500/12 px-2 py-0.5 text-[10px] font-semibold text-green-800 group-data-[theme=dark]/dashboard:text-green-200">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted tabular-nums">
                    Joined {formatJoinedDate(row.createdAt)}
                  </p>
                  {secondary ? (
                    <p className="break-all text-sm text-ink-muted">{secondary}</p>
                  ) : null}
                  <div className="text-sm leading-relaxed text-ink-muted">
                    <span className="text-ink">Title:</span>{" "}
                    <span className="text-ink">{row.title?.trim() ? row.title : "—"}</span>
                    <span className="mx-2 text-border">·</span>
                    <span className="text-ink">Access:</span>{" "}
                    <span className="break-words text-ink">{accessText}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditMemberId(row.id)}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                    >
                      Edit profile &amp; access
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!row.disabled ? (
                      <button
                        type="button"
                        disabled={busy || self}
                        title={self ? "Use another owner to disable this account" : undefined}
                        onClick={() => {
                          if (
                            !confirmDestructiveAction(
                              `Disable account for ${primary}?`,
                              "They will not be able to sign in until you enable the account again."
                            )
                          )
                            return;
                          void setDisabled(row.id, true);
                        }}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setDisabled(row.id, false)}
                        className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                      >
                        Enable
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || self}
                      title={self ? "You cannot delete your own account here" : undefined}
                      onClick={() => setDeleteConfirmId(row.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 group-data-[theme=dark]/dashboard:border-red-900/50 group-data-[theme=dark]/dashboard:bg-red-950/40 group-data-[theme=dark]/dashboard:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {users.length === 0 ? <p className="text-sm text-ink-muted">No accounts found.</p> : null}
      </div>

      {deleteRow ? (
        <div
          className="fixed inset-0 z-[65] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-member-title"
            aria-describedby="delete-member-desc"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl border border-border bg-primary/[0.06] px-3 py-2 text-sm text-ink">
              <strong className="font-semibold">Warning:</strong> This permanently removes the account. They will
              lose dashboard access immediately and cannot sign in again unless you invite them back.
            </div>
            <h3 id="delete-member-title" className="mt-4 text-lg font-bold text-ink">
              Delete team member?
            </h3>
            <p id="delete-member-desc" className="mt-2 text-sm leading-relaxed text-ink-muted">
              You are about to delete{" "}
              <span className="font-semibold text-ink">
                {personPrimarySecondary(deleteRow).primary}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busyId === deleteRow.id}
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-border bg-ink/[0.02] px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteRow.id}
                onClick={() => void removeUser(deleteRow.id)}
                className="rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 group-data-[theme=dark]/dashboard:border-red-800"
              >
                {busyId === deleteRow.id ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editRow ? (
        <MemberEditModal
          key={editRow.id}
          memberEmailLine={isKitchenDeviceEmail(editRow.email) ? null : editRow.email}
          initialTitle={editRow.title}
          initialFirstName={isKitchenDeviceEmail(editRow.email) ? null : editRow.firstName}
          initialLastName={isKitchenDeviceEmail(editRow.email) ? null : editRow.lastName}
          accessSummary={teamAccessSummary(editRow.role, editRow.permissions)}
          isKitchenDevice={isKitchenDeviceEmail(editRow.email)}
          busy={busyId === editRow.id}
          onClose={() => setEditMemberId(null)}
          onSaveProfile={(p) => saveMemberProfile(editRow.id, p)}
          onChangeDashboardAccess={() => {
            setEditMemberId(null);
            setAccessPickerId(editRow.id);
          }}
        />
      ) : null}

      {pickerRow && !isKitchenDeviceEmail(pickerRow.email) ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            setAccessPickerId(null);
            setAccessPickerMode("roles");
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-picker-title"
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 id="access-picker-title" className="text-base font-bold text-ink">
                  {accessPickerMode === "custom" ? "Custom access" : "Access"}
                </h3>
                <AccessPickerSubtitle row={pickerRow} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccessPickerId(null);
                  setAccessPickerMode("roles");
                }}
                className="shrink-0 rounded-lg p-2 text-ink-muted hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {accessPickerMode === "roles" ? (
              <>
                {!isKnownAccessRole(pickerRow.role) ? (
                  <p className="mt-3 rounded-lg border border-border bg-ink/[0.04] px-2.5 py-1.5 text-xs text-ink-muted">
                    Legacy role — pick a replacement below.
                  </p>
                ) : null}

                <div className="mt-3 space-y-5">
                  {ACCESS_PICKER_SECTIONS.map((section) => (
                    <div key={section.id}>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{section.heading}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {section.roles.map((role) => {
                          const selected = pickerRow.role === role;
                          const rowBusy = busyId === pickerRow.id;
                          return (
                            <li key={role}>
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() =>
                                  void pickAccessFromModal(pickerRow.id, role, pickerRow.role)
                                }
                                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                                  selected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                    : "border-border bg-card hover:bg-ink/[0.03]"
                                }`}
                              >
                                <span className="block text-sm font-semibold text-ink">
                                  {accessTypeCompactSummary(role)}
                                </span>
                                <span className="mt-0.5 block text-xs text-ink-muted">{ACCESS_HINT[role]}</span>
                                {selected ? (
                                  <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    Current
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Custom</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Choose exactly which dashboard sections apply (Team tab sign-in).
                    </p>
                    <button
                      type="button"
                      disabled={busyId === pickerRow.id}
                      onClick={openCustomPicker}
                      className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                        pickerRow.role === STAFF_GRANULAR_ROLE
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-card hover:bg-ink/[0.03]"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-ink">
                        {accessTypeCompactSummary(STAFF_GRANULAR_ROLE)}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        Overview, menu, tables, orders, waiter, office, options — pick any combination.
                      </span>
                      {pickerRow.role === STAFF_GRANULAR_ROLE ? (
                        <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Current — edit sections
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busyId === pickerRow.id}
                  onClick={() => setAccessPickerMode("roles")}
                  className="mt-3 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  ← Back
                </button>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {DASHBOARD_SECTION_IDS.map((id) => (
                    <li key={id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:bg-ink/[0.03]">
                        <input
                          type="checkbox"
                          checked={customPermDraft[id]}
                          disabled={busyId === pickerRow.id}
                          onChange={() =>
                            setCustomPermDraft((p) => ({ ...p, [id]: !p[id] }))
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
                        />
                        <span className="break-words text-sm font-medium leading-snug text-ink">
                          {SECTION_LABELS[id]}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busyId === pickerRow.id}
                  onClick={() => void saveCustomAccess()}
                  className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {busyId === pickerRow.id ? "Saving…" : "Save custom access"}
                </button>
              </>
            )}

            <p className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setAccessPickerId(null);
                  setAccessPickerMode("roles");
                }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Cancel
              </button>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
