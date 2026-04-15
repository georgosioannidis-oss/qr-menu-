"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

export function PrintAgentSection({ hasPrintAgentToken }: { hasPrintAgentToken: boolean }) {
  const [hasToken, setHasToken] = useState(hasPrintAgentToken);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "gen" | "revoke">(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setHasToken(hasPrintAgentToken);
  }, [hasPrintAgentToken]);

  const generate = async () => {
    setBusy("gen");
    setMessage(null);
    setRevealedToken(null);
    try {
      const res = await fetch("/api/dashboard/print-agent/token", { method: "POST" });
      const text = await res.text();
      let data: { token?: string; error?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        const err = data.error ?? "Could not create token";
        setMessage({ type: "err", text: err });
        toast.error(err);
        return;
      }
      if (data.token) {
        setRevealedToken(data.token);
        setHasToken(true);
        setMessage({
          type: "ok",
          text: "Token created. Copy it below, then set PRINT_AGENT_TOKEN on the kitchen computer.",
        });
        toast.success("Print token created — copy it now");
      }
    } catch {
      setMessage({ type: "err", text: "Request failed" });
      toast.error("Request failed");
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    if (
      !confirmDestructiveAction(
        "Revoke the print agent token?",
        "The kitchen script will stop printing until you create a new token."
      )
    ) {
      return;
    }
    setBusy("revoke");
    setMessage(null);
    setRevealedToken(null);
    try {
      const res = await fetch("/api/dashboard/print-agent/token", { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        const err = d.error ?? "Could not revoke";
        setMessage({ type: "err", text: err });
        toast.error(err);
        return;
      }
      setHasToken(false);
      setMessage({ type: "ok", text: "Token revoked. Auto-print API is disabled." });
      toast.success("Print token revoked");
    } catch {
      setMessage({ type: "err", text: "Request failed" });
      toast.error("Request failed");
    } finally {
      setBusy(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold text-ink mb-1">Auto-print (kitchen PC)</h2>
      <p className="text-ink-muted text-sm mb-4">
        Run a small script on a computer next to your printer. It polls for new kitchen orders and can send plain-text
        tickets to your default print command (e.g. <code className="text-xs bg-surface px-1 rounded">lp</code> on
        Mac/Linux). Your app stays in the cloud; only the script talks to the printer.
      </p>

      <ol className="list-decimal list-inside text-sm text-ink-muted space-y-2 mb-4">
        <li>Create or rotate a token below.</li>
        <li>
          On the kitchen machine: install Node 18+, then{" "}
          <code className="text-xs bg-surface px-1 rounded">npm run print-agent</code> with{" "}
          <code className="text-xs bg-surface px-1 rounded">PRINT_AGENT_BASE_URL</code> and{" "}
          <code className="text-xs bg-surface px-1 rounded">PRINT_AGENT_TOKEN</code> set (see <code>.env.example</code>).
        </li>
        <li>Optional: set <code className="text-xs bg-surface px-1 rounded">PRINT_COMMAND</code> to pipe tickets to your printer.</li>
      </ol>

      {origin && (
        <p className="dashboard-copy-mono text-xs text-ink-muted mb-4 font-mono break-words">
          Base URL for this site: <span className="text-ink">{origin}</span>
        </p>
      )}

      {message && (
        <p
          className={`text-sm mb-3 rounded-lg px-3 py-2 ${
            message.type === "ok" ? "bg-emerald-500/10 text-emerald-900" : "bg-red-500/10 text-red-900"
          }`}
        >
          {message.text}
        </p>
      )}

      {revealedToken && (
        <div className="mb-4 rounded-xl border-2 border-amber-400/60 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-950 mb-1">Copy this token now (shown once):</p>
          <code className="dashboard-copy-mono block break-words text-xs text-ink select-all">
            {revealedToken}
          </code>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={generate}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {busy === "gen" ? (
            <>
              <Spinner className="h-4 w-4 border-white border-t-transparent" />
              Working…
            </>
          ) : hasToken ? (
            "Rotate token"
          ) : (
            "Create token"
          )}
        </button>
        {hasToken && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={revoke}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
          >
            {busy === "revoke" ? (
              <>
                <Spinner className="h-4 w-4 border-ink border-t-transparent" />
                Revoking…
              </>
            ) : (
              "Revoke token"
            )}
          </button>
        )}
      </div>
    </section>
  );
}
