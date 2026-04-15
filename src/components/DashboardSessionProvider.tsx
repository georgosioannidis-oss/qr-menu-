"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AppDashboardSession } from "@/lib/app-session";

type DashboardSessionContextValue = {
  session: AppDashboardSession;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
};

const DashboardSessionContext = createContext<DashboardSessionContextValue | null>(null);

export function DashboardSessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  /** Server-populated NextAuth session (structurally matches `AppDashboardSession`). */
  initialSession: AppDashboardSession;
}) {
  const [session, setSession] = useState<AppDashboardSession>(initialSession);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/session", { credentials: "include" });
      if (!r.ok) return;
      const data = (await r.json()) as AppDashboardSession | null;
      if (data?.user) setSession(data);
      else setSession(null);
    } catch {
      /* Network or parse errors — keep existing session to avoid a blank shell until retry/refresh. */
    } finally {
      setLoading(false);
    }
  }, []);

  /* Server already provides initialSession — skip the extra fetch on mount.
     Consumers can call refresh() explicitly after mutations that change the session. */

  const value = useMemo((): DashboardSessionContextValue => {
    const authed = Boolean(session?.user?.id);
    return {
      session,
      status: loading && !authed ? "loading" : authed ? "authenticated" : "unauthenticated",
      refresh,
    };
  }, [session, loading, refresh]);

  return (
    <DashboardSessionContext.Provider value={value}>{children}</DashboardSessionContext.Provider>
  );
}

export function useDashboardSession() {
  const ctx = useContext(DashboardSessionContext);
  if (!ctx) {
    throw new Error("useDashboardSession must be used under DashboardSessionProvider");
  }
  return ctx;
}
