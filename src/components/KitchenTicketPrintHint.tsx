"use client";

import Link from "next/link";

/**
 * Expandable copy: browser “Print ticket” vs optional kitchen PC print-agent script.
 */
export function KitchenTicketPrintHint() {
  return (
    <details className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-ink-muted shadow-sm">
      <summary className="cursor-pointer list-none font-medium text-ink select-none [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 hover:underline">
          What is “Print ticket”? How does auto-print work?
        </span>
      </summary>
      <div className="mt-3 space-y-3 border-t border-border pt-3 leading-relaxed">
        <p>
          <strong className="text-ink">Print ticket</strong> opens a{" "}
          <strong className="text-ink">kitchen slip</strong> in a new tab. Your browser’s print dialog sends it to a
          printer or PDF. The same page is linked from <strong className="text-ink">Orders</strong> and{" "}
          <strong className="text-ink">Wait staff</strong> on purpose: both roles may need a paper ticket for the same
          order, and the layout is identical.
        </p>
        <p>
          <strong className="text-ink">Auto-print</strong> is separate: a{" "}
          <strong className="text-ink">print agent</strong> script runs on a computer near your printer, polls the app
          for new kitchen orders, and prints plain-text tickets (e.g. via{" "}
          <code className="rounded bg-surface px-1 font-mono text-xs">lp</code> on Mac/Linux). Set it up under{" "}
          <Link
            href="/dashboard/branding"
            className="font-semibold text-primary underline underline-offset-2 hover:opacity-90"
          >
            Options → Auto-print (kitchen PC)
          </Link>{" "}
          (token + <code className="rounded bg-surface px-1 font-mono text-xs">npm run print-agent</code>; see{" "}
          <code className="rounded bg-surface px-1 font-mono text-xs">.env.example</code>
          ).
        </p>
      </div>
    </details>
  );
}
