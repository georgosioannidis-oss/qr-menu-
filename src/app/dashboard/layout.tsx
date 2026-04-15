import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardServerSession } from "@/lib/auth-server";
import { getCachedRestaurantUserDashboardRow } from "@/lib/dashboard-request-cache";
import { isDatabaseConnectionError } from "@/lib/database-connection-error";
import { dashboardPathRedirect } from "@/lib/dashboard-path-guard";

const DASHBOARD_PATH_HEADER = "x-dashboard-path";

function DashboardDatabaseUnavailable() {
  return (
    <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 text-ink shadow-sm">
        <h1 className="text-xl font-bold text-ink">Dashboard unavailable</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          The app can&apos;t reach your database right now. This usually means Supabase is paused, your{" "}
          <code className="rounded bg-ink/10 px-1 py-0.5 text-xs text-ink">DATABASE_URL</code> in{" "}
          <code className="rounded bg-ink/10 px-1 py-0.5 text-xs text-ink">.env</code> is wrong, or your
          network is blocking the connection.
        </p>
        <ul className="list-inside list-disc text-sm text-neutral-600 dark:text-neutral-300">
          <li>Open Supabase → restore the project if it shows as paused.</li>
          <li>Copy a fresh connection string from Settings → Database.</li>
          <li>Restart <code className="text-xs">npm run dev</code> after changing <code className="text-xs">.env</code>.</li>
        </ul>
        <p className="text-sm text-ink-muted">
          <Link href="/dashboard/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get(DASHBOARD_PATH_HEADER) ?? "";

  if (
    pathname &&
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/login")
  ) {
    const session = await getDashboardServerSession();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const restaurantId = session?.user?.restaurantId;

    if (!session || !userId || !restaurantId) {
      redirect(`/dashboard/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }

    let row: { role: string; disabled: boolean; permissions: unknown } | null;
    try {
      const u = await getCachedRestaurantUserDashboardRow(userId);
      row =
        u && u.restaurantId === restaurantId
          ? { role: u.role, disabled: u.disabled, permissions: u.permissions }
          : null;
    } catch (e) {
      if (isDatabaseConnectionError(e)) {
        return <DashboardDatabaseUnavailable />;
      }
      throw e;
    }

    if (!row || row.disabled) {
      redirect("/dashboard/login");
    }

    const target = dashboardPathRedirect(pathname, row.role, row.permissions);
    if (target) redirect(target);
  }

  return <div className="min-h-screen bg-surface">{children}</div>;
}
