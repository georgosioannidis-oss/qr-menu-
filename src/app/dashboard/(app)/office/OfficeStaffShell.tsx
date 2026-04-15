"use client";

import { useEffect, useState } from "react";
import { OfficeEmployeesSection, type OfficeEmployeeRow } from "./OfficeEmployeesSection";
import {
  OfficeStaffInvitesSection,
  type StaffInviteRow,
} from "./OfficeStaffInvitesSection";
import { OfficeStaffMenuAccess } from "./OfficeStaffMenuAccess";

export function OfficeStaffShell({
  staffMayEditMenuTables,
  initialInvites,
  initialUsers,
  inviteNameByEmail,
  currentUserId,
}: {
  staffMayEditMenuTables: boolean;
  initialInvites: StaffInviteRow[];
  initialUsers: OfficeEmployeeRow[];
  inviteNameByEmail: Record<string, string>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

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
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Team &amp; access</h2>
            <p className="text-wrap-pretty mt-1 text-sm text-ink-muted">
              Menu/tables for staff, invite links, and team roles — opens in a window so sales stay up top.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Manage team
          </button>
        </div>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-staff-popup-title"
            className="flex max-h-[100dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-h-[min(92dvh,880px)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id="office-staff-popup-title" className="text-lg font-bold text-ink">
                Team &amp; access
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <div className="space-y-5">
                <OfficeStaffMenuAccess initialValue={staffMayEditMenuTables} embedded />
                <OfficeStaffInvitesSection
                  initialInvites={initialInvites}
                  inviteNameByEmail={inviteNameByEmail}
                  embedded
                />
                {currentUserId ? (
                  <OfficeEmployeesSection
                    initialUsers={initialUsers}
                    currentUserId={currentUserId}
                    embedded
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
