"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export type MemberProfilePayload = {
  title: string;
  firstName: string;
  lastName: string;
};

export function MemberEditModal({
  memberEmailLine,
  initialTitle,
  /** null for prep device — hide name fields */
  initialFirstName,
  initialLastName,
  accessSummary,
  isKitchenDevice,
  busy,
  onClose,
  onSaveProfile,
  onChangeDashboardAccess,
}: {
  memberEmailLine: string | null;
  initialTitle: string | null;
  initialFirstName: string | null;
  initialLastName: string | null;
  accessSummary: string;
  isKitchenDevice: boolean;
  busy: boolean;
  onClose: () => void;
  onSaveProfile: (p: MemberProfilePayload) => Promise<void>;
  onChangeDashboardAccess: () => void;
}) {
  const [title, setTitle] = useState(() => initialTitle ?? "");
  const [firstName, setFirstName] = useState(() => initialFirstName ?? "");
  const [lastName, setLastName] = useState(() => initialLastName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initialTitle ?? "");
    setFirstName(initialFirstName ?? "");
    setLastName(initialLastName ?? "");
  }, [initialTitle, initialFirstName, initialLastName]);

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

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await onSaveProfile({
        title: title.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  const formBusy = saving || busy;

  return (
    <div
      className="fixed inset-0 z-[58] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-edit-title"
        className="max-h-[min(92dvh,640px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="member-edit-title" className="text-lg font-bold text-ink">
          Edit member
        </h3>
        {memberEmailLine ? (
          <p className="mt-1 break-all text-sm text-ink-muted">{memberEmailLine}</p>
        ) : null}

        {!isKitchenDevice ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wide text-ink-muted"
                htmlFor="member-first"
              >
                First name
              </label>
              <input
                id="member-first"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                maxLength={80}
                disabled={formBusy}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-ink/[0.02] px-3 py-2 text-sm text-ink outline-none ring-primary focus:ring-2 disabled:opacity-50"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wide text-ink-muted"
                htmlFor="member-last"
              >
                Last name
              </label>
              <input
                id="member-last"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                maxLength={80}
                disabled={formBusy}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-ink/[0.02] px-3 py-2 text-sm text-ink outline-none ring-primary focus:ring-2 disabled:opacity-50"
              />
            </div>
          </div>
        ) : null}

        <div className={`space-y-2 ${isKitchenDevice ? "mt-5" : "mt-4"}`}>
          <label
            className="text-xs font-bold uppercase tracking-wide text-ink-muted"
            htmlFor="member-edit-title-field"
          >
            Job title
          </label>
          <input
            id="member-edit-title-field"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bartender"
            maxLength={80}
            disabled={formBusy}
            className="min-h-11 w-full rounded-xl border border-border bg-ink/[0.02] px-3 py-2 text-sm text-ink outline-none ring-primary focus:ring-2 disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          disabled={formBusy}
          onClick={() => void handleSaveProfile()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {saving ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
          Save profile
        </button>

        <div className="mt-6 rounded-xl border border-border bg-ink/[0.02] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Dashboard access</p>
          {isKitchenDevice ? (
            <p className="mt-2 text-sm text-ink-muted">
              Prep tablet accounts use fixed prep access; this cannot be changed here.
            </p>
          ) : (
            <>
              <p className="mt-2 break-words text-sm font-medium leading-snug text-ink">{accessSummary}</p>
              <button
                type="button"
                disabled={busy}
                onClick={onChangeDashboardAccess}
                className="mt-3 w-full rounded-xl border-2 border-border bg-card py-2.5 text-sm font-semibold text-ink hover:bg-ink/[0.03] disabled:opacity-50"
              >
                Change access…
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
        >
          Done
        </button>
      </div>
    </div>
  );
}
