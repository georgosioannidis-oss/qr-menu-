"use client";

import type { AppDashboardSession } from "@/lib/app-session";

function authBasePath(channel: "owner" | "staff") {
  return channel === "staff" ? "/api/auth-staff" : "/api/auth-owner";
}

/** Ends only the dashboard session that matches the merged session (owner cookie vs staff cookie). */
export async function dashboardSignOut(session: AppDashboardSession) {
  const channel = session?.dashboardAuthChannel ?? "owner";
  const basePath = authBasePath(channel);
  const csrfRes = await fetch(`${basePath}/csrf`, { credentials: "include" });
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
  const csrfToken = csrfJson.csrfToken;
  if (!csrfToken) return;

  const callbackUrl = `${window.location.origin}/dashboard/login`;
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl,
    json: "true",
  });
  await fetch(`${basePath}/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include",
  });
  window.location.href = "/dashboard/login";
}
