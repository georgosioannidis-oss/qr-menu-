"use client";

import { Toaster } from "sonner";

/**
 * Global toasts. Uses CSS variables from `:root` / guest `[data-theme]` so colors stay on-brand.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      closeButton
      duration={3800}
      visibleToasts={2}
      expand={false}
      offset="1rem"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-card text-ink shadow-lg backdrop-blur-sm [&_[data-description]]:text-ink-muted",
          title: "font-semibold text-ink",
          description: "text-sm text-ink-muted",
          success: "border-emerald-600/35",
          error: "border-red-600/40",
          closeButton: "text-ink-muted hover:text-ink hover:bg-surface",
        },
      }}
    />
  );
}
