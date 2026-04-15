"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDashboardSession } from "@/components/DashboardSessionProvider";
import { dashboardSignOut } from "@/lib/dashboard-sign-out";

function EditAccountModal({
  open,
  currentEmail,
  onClose,
  onSaved,
}: {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNewEmail(currentEmail);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, currentEmail]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailTrim = newEmail.trim().toLowerCase();
    const emailNorm = currentEmail.trim().toLowerCase();
    const wantEmail = emailTrim.length > 0 && emailTrim !== emailNorm;
    const wantPw = newPassword.length > 0;

    if (!wantEmail && !wantPw) {
      toast.error("Change your email or enter a new password.");
      return;
    }
    if (wantPw && newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    if (wantPw && newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const body: { currentPassword: string; newEmail?: string; newPassword?: string } = {
        currentPassword,
      };
      if (wantEmail) body.newEmail = emailTrim;
      if (wantPw) body.newPassword = newPassword;

      const res = await fetch("/api/dashboard/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; email?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update account.");
        return;
      }
      toast.success("Account updated.");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-account-title"
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-account-title" className="text-lg font-bold text-ink">
          Edit account
        </h2>
        <p className="mt-1 text-xs text-ink-muted">Update your sign-in email or password. Current password is required.</p>
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-ink-muted" htmlFor="acct-current-pw">
              Current password
            </label>
            <input
              id="acct-current-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ink/[0.03] px-3 py-2.5 text-sm text-ink outline-none ring-primary focus:ring-2"
              disabled={busy}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted" htmlFor="acct-email">
              Email
            </label>
            <input
              id="acct-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ink/[0.03] px-3 py-2.5 text-sm text-ink outline-none ring-primary focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted" htmlFor="acct-new-pw">
              New password{" "}
              <span className="font-normal text-ink-muted/80">(optional)</span>
            </label>
            <input
              id="acct-new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ink/[0.03] px-3 py-2.5 text-sm text-ink outline-none ring-primary focus:ring-2"
              disabled={busy}
            />
          </div>
          {newPassword ? (
            <div>
              <label className="text-xs font-semibold text-ink-muted" htmlFor="acct-confirm-pw">
                Confirm new password
              </label>
              <input
                id="acct-confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ink/[0.03] px-3 py-2.5 text-sm text-ink outline-none ring-primary focus:ring-2"
                disabled={busy}
              />
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-border bg-ink/[0.02] px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/[0.06] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DashboardAccountMenu() {
  const { session, refresh } = useDashboardSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const u = session?.user as
    | { firstName?: string | null; lastName?: string | null; email?: string | null }
    | undefined;
  const nameLine = [u?.firstName?.trim(), u?.lastName?.trim()].filter(Boolean).join(" ");
  const displayName = nameLine || u?.email?.trim() || "Account";
  const email = u?.email?.trim() ?? "";

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  return (
    <div ref={rootRef} className="relative z-20 shrink-0">
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((o) => !o)}
        title={email || displayName}
        className="flex min-h-[44px] max-w-[min(100%,14rem)] items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium text-ink transition-colors hover:bg-ink/5 sm:min-h-[40px] sm:text-sm"
      >
        <span className="min-w-0 truncate">{displayName}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            Account settings
          </p>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-ink/5"
            onClick={() => {
              closeMenu();
              setEditOpen(true);
            }}
          >
            Edit account
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-ink-muted hover:bg-ink/5 hover:text-ink"
            onClick={() => void dashboardSignOut(session)}
          >
            Log out
          </button>
        </div>
      ) : null}

      <EditAccountModal
        open={editOpen}
        currentEmail={email}
        onClose={() => setEditOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
