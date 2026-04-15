"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { teamAccessSummary } from "@/lib/accessTypeLabels";

export function JoinStaffForm({
  token,
  restaurantName,
  inviteRole,
  invitePermissions,
}: {
  token: string;
  restaurantName: string;
  inviteRole: string;
  invitePermissions: unknown;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/join/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create account.");
        return;
      }
      router.push("/dashboard/login?joined=1");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-[1.65rem] font-bold leading-tight text-neutral-900 mb-1 sm:text-2xl">
          Join the team
        </h1>
        <p className="text-center text-base leading-relaxed text-neutral-600 mb-6 sm:text-sm">
          This link is only to <strong>register your account</strong>. You&apos;re joining{" "}
          <strong>{restaurantName}</strong> with <strong>{teamAccessSummary(inviteRole, invitePermissions)}</strong>.
          Next time onward, use the normal login page and the{" "}
          <strong>{inviteRole === "owner" ? "Owner" : "Team"}</strong> tab—no invite link needed.
        </p>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-black/10 p-6 space-y-4"
        >
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-base leading-relaxed text-red-700 sm:text-sm">
              {error}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1 block text-base font-semibold text-neutral-900 sm:text-sm">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="w-full min-h-[48px] rounded-xl border-2 border-black/10 px-4 py-2.5 text-base text-neutral-900 focus:border-[#C15C2A] focus:outline-none sm:min-h-0 sm:text-sm"
                placeholder="Sam"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1 block text-base font-semibold text-neutral-900 sm:text-sm">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                className="w-full min-h-[48px] rounded-xl border-2 border-black/10 px-4 py-2.5 text-base text-neutral-900 focus:border-[#C15C2A] focus:outline-none sm:min-h-0 sm:text-sm"
                placeholder="Rivera"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-base font-semibold text-neutral-900 sm:text-sm">
              Your email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full min-h-[48px] rounded-xl border-2 border-black/10 px-4 py-2.5 text-base text-neutral-900 focus:border-[#C15C2A] focus:outline-none sm:min-h-0 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-base font-semibold text-neutral-900 sm:text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full min-h-[48px] rounded-xl border-2 border-black/10 px-4 py-2.5 text-base text-neutral-900 focus:border-[#C15C2A] focus:outline-none sm:min-h-0 sm:text-sm"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-base font-semibold text-neutral-900 sm:text-sm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full min-h-[48px] rounded-xl border-2 border-black/10 px-4 py-2.5 text-base text-neutral-900 focus:border-[#C15C2A] focus:outline-none sm:min-h-0 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#C15C2A] py-3 text-base font-semibold text-white hover:bg-[#A04A22] disabled:opacity-50 sm:min-h-0 sm:text-sm"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-base text-neutral-600 sm:text-sm">
          <Link href="/dashboard/login" className="text-[#C15C2A] font-semibold hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
