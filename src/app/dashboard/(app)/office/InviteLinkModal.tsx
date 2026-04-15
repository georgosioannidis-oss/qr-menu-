"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Minimal dialog: URL only + Copy and Cancel. z-[70] above team shell / access picker.
 */
export function InviteLinkModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the text and copy manually.");
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
        aria-label="Invite link"
        className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sr-only">Invite link — copy to share</span>
        <textarea
          readOnly
          value={url}
          rows={4}
          onFocus={(e) => e.target.select()}
          aria-label="Invite URL"
          className="dashboard-copy-mono max-h-40 min-h-[4.5rem] w-full cursor-text select-all resize-none rounded-xl border border-border bg-ink/[0.03] px-3 py-3 font-mono text-sm leading-relaxed text-ink outline-none ring-primary focus:ring-2"
        />

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
