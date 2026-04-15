"use client";

import Link from "next/link";
import { SessionProvider, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useMemo } from "react";

type LoginTab = "owner" | "wait_staff";

const tabBase =
  "flex-1 rounded-lg px-3 py-2.5 text-base font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:py-2 sm:text-sm";

function pathnameFromCallbackUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "/";
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      return new URL(s).pathname;
    }
    return s.split("?")[0] || "/";
  } catch {
    return "/";
  }
}

function messageForSignInError(errorCode: unknown, tab: LoginTab): string {
  const code = typeof errorCode === "string" && errorCode.length > 0 ? errorCode : undefined;
  if (code === "AccessDenied") {
    return "Access denied. Contact the restaurant owner.";
  }
  if (code === "Configuration") {
    return "Sign-in is misconfigured on the server (check NEXTAUTH_SECRET and NEXTAUTH_URL).";
  }
  if (code === "CredentialsSignin" || !code) {
    if (tab === "owner") {
      return "Invalid email or password, or this account is not an owner login.";
    }
    return "Invalid email or password, or use the Owner or Team tab for that account.";
  }
  return `Sign-in failed (${code}). Try again or use a different tab.`;
}

function absoluteCallbackUrl(raw: string): string {
  if (typeof window === "undefined") return raw;
  try {
    return new URL(raw.trim() || "/", window.location.origin).href;
  } catch {
    return raw;
  }
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackParam = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl = absoluteCallbackUrl(callbackParam);
  const signedUpSlug = searchParams.get("slug")?.trim() ?? "";

  const joinedFromQuery = searchParams.get("joined") === "1";
  const callbackPath = pathnameFromCallbackUrl(callbackParam);
  const tabFromQuery = useMemo((): LoginTab => {
    if (joinedFromQuery) return "wait_staff";
    if (callbackPath.startsWith("/dashboard/wait-staff")) return "wait_staff";
    return "owner";
  }, [joinedFromQuery, callbackPath]);

  const [tab, setTab] = useState<LoginTab>(tabFromQuery);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authBasePath = tab === "owner" ? "/api/auth-owner" : "/api/auth-staff";

  useEffect(() => {
    setTab(tabFromQuery);
  }, [tabFromQuery]);

  useEffect(() => {
    if (searchParams.get("accountDisabled") === "1") {
      setError("This account has been disabled. Contact the restaurant owner.");
      return;
    }
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") {
      setError(messageForSignInError(err, tabFromQuery));
    }
  }, [searchParams, tabFromQuery]);

  const signedUp = searchParams.get("signedup") === "1";
  const joinedStaff = searchParams.get("joined") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let navigated = false;
    try {
      const base = { callbackUrl, redirect: false as const };
      const res = await signIn(
        "credentials",
        tab === "wait_staff"
          ? {
              ...base,
              loginMode: "wait_staff",
              email: email.trim().toLowerCase(),
              password,
              restaurantSlug: "",
            }
          : {
              ...base,
              loginMode: "owner",
              email: email.trim().toLowerCase(),
              password,
              restaurantSlug: "",
            }
      );

      if (res?.error) {
        setError(messageForSignInError(res.error, tab));
        return;
      }

      if (res?.ok) {
        const raw = res.url && res.url.length > 0 ? res.url : callbackUrl;
        if (typeof window !== "undefined") {
          const u = new URL(raw, window.location.origin);
          const dest = `${u.pathname}${u.search}`;
          /* Client transition picks up the new session cookie reliably; full reload sometimes raced CSS/RSC. */
          navigated = true;
          router.replace(dest);
          router.refresh();
        }
        return;
      }

      setError("Could not sign in. Try again.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Network error. Check your connection and try again.";
      setError(
        /invalid url|failed to construct ['"]url['"]/i.test(msg)
          ? "Sign-in response was invalid. Try again."
          : msg
      );
    } finally {
      if (!navigated) setLoading(false);
    }
  }

  return (
    <SessionProvider basePath={authBasePath} key={authBasePath}>
      <main className="login-page-theme min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-[1.65rem] font-bold leading-tight text-ink text-center mb-2 sm:text-2xl">
            Restaurant dashboard
          </h1>
          <p className="text-center text-base leading-relaxed text-ink-muted sm:text-sm mb-6">
            Choose how you&apos;re signing in, then enter your details.
          </p>

          <div
            className="mb-4 flex gap-1 rounded-xl border-2 border-black/10 bg-white p-1 shadow-sm"
            role="tablist"
            aria-label="Sign-in type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "owner"}
              onClick={() => {
                setTab("owner");
                setError("");
              }}
              className={`${tabBase} ${
                tab === "owner" ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:bg-black/[0.04]"
              }`}
            >
              Owner
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "wait_staff"}
              onClick={() => {
                setTab("wait_staff");
                setError("");
              }}
              className={`${tabBase} ${
                tab === "wait_staff"
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-muted hover:bg-black/[0.04]"
              }`}
            >
              Team
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-md border border-black/10 p-6 space-y-4"
          >
            {signedUp && (
              <p className="rounded-xl border border-border bg-primary/[0.07] px-3 py-2 text-base leading-relaxed text-ink sm:text-sm">
                Account created. Sign in as <strong>Owner</strong> with your email and password.
                {signedUpSlug ? (
                  <>
                    {" "}
                    Your restaurant slug is <strong className="font-mono">{signedUpSlug}</strong> (for table links and
                    QR codes).
                  </>
                ) : null}
              </p>
            )}
            {joinedStaff && (
              <p className="rounded-xl border border-border bg-primary/[0.07] px-3 py-2 text-base leading-relaxed text-ink sm:text-sm">
                Account created. Sign in with the <strong>Team</strong> tab using the email and password you just set.
              </p>
            )}
            {error && (
              <p className="text-base leading-relaxed text-red-800 bg-red-50 rounded-xl px-3 py-2 sm:text-sm">
                {error}
              </p>
            )}

            {tab === "owner" && (
              <>
                <p className="text-sm leading-relaxed text-ink-muted sm:text-xs">
                  Full dashboard, Office, Options, and billing-style controls. Not for shared tablets.
                </p>
                <div>
                  <label htmlFor="email" className="block text-base font-semibold text-ink mb-1 sm:text-sm">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full min-h-[48px] px-4 py-3 border-2 border-black/10 rounded-xl text-base text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none sm:min-h-0 sm:py-2.5 sm:text-sm"
                    placeholder="you@restaurant.com"
                  />
                </div>
              </>
            )}

            {tab === "wait_staff" && (
              <>
                <p className="text-sm leading-relaxed text-ink-muted sm:text-xs">
                  Kitchen, wait staff, and other team accounts: invite link or accounts your owner created in Office.
                </p>
                <div>
                  <label htmlFor="email-waiter" className="block text-base font-semibold text-ink mb-1 sm:text-sm">
                    Email
                  </label>
                  <input
                    id="email-waiter"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full min-h-[48px] px-4 py-3 border-2 border-black/10 rounded-xl text-base text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none sm:min-h-0 sm:py-2.5 sm:text-sm"
                    placeholder="waiter@restaurant.com"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="password" className="block text-base font-semibold text-ink mb-1 sm:text-sm">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === "owner" ? "current-password" : "current-password"}
                className="w-full min-h-[48px] px-4 py-3 border-2 border-black/10 rounded-xl text-base text-ink focus:border-primary focus:outline-none sm:min-h-0 sm:py-2.5 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-primary py-3.5 text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-opacity sm:min-h-0 sm:py-3 sm:text-sm"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-base text-ink-muted mt-4 leading-relaxed sm:text-sm">
            <span className="font-medium text-ink">Demo</span>
            <br />
            <span className="text-sm sm:text-xs">
              Owner: admin@demo.com / demo123
              <br />
              Team (kitchen / wait): waiter@demo.com / demo123 · kitchen@demo.com / demo123
            </span>
          </p>
          <p className="text-center text-base mt-3 sm:text-sm">
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Don&apos;t have an account? Sign up
            </Link>
          </p>
        </div>
      </main>
    </SessionProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-page-theme min-h-screen flex items-center justify-center bg-surface p-4">
          <p className="text-base text-ink-muted sm:text-sm">Loading…</p>
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
