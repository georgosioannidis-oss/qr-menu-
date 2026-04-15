import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardServerSession } from "@/lib/auth-server";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/dashboard-roles";
import { getCachedRestaurantUserDashboardRow } from "@/lib/dashboard-request-cache";
import { prisma } from "@/lib/prisma";
import { defaultDashboardHome, resolveDashboardAccess } from "@/lib/staff-permissions";

const CONFIRMED_STATUSES = [...CONFIRMED_ORDER_STATUSES];

/** Same shape as `getCachedRestaurantBranding` (inline for a single interactive $transaction). */
const restaurantBrandingSelect = {
  name: true,
  logoUrl: true,
  primaryColor: true,
  colorMode: true,
  staffMayEditMenuTables: true,
  navLabelOrdersQueue: true,
  navLabelGuestOrders: true,
} as const;

function fmtUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Awaiting payment",
    paid: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
    declined: "Declined",
  };
  return map[status] ?? status;
}

export default async function DashboardPage() {
  const session = await getDashboardServerSession();
  if (!session?.user?.restaurantId) redirect("/dashboard/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/dashboard/login");

  const restaurantId = session.user.restaurantId;
  const account = await getCachedRestaurantUserDashboardRow(userId);
  if (account?.disabled) {
    redirect("/dashboard/login?accountDisabled=1");
  }
  if (account && account.restaurantId !== restaurantId) {
    redirect("/dashboard/login?accountDisabled=1");
  }
  const access = resolveDashboardAccess(
    account && account.restaurantId === restaurantId && !account.disabled
      ? { role: account.role, permissions: account.permissions }
      : { role: session.user.role ?? "", permissions: null },
  );
  if (!access.overview) {
    redirect(defaultDashboardHome(access));
  }
  const todayStart = startOfLocalDay(new Date());

  /** One interactive transaction so Supabase transaction pooler keeps one backend session for the whole batch (avoids `26000 prepared statement does not exist` from parallel pooled connections). */
  const [
    restaurant,
    categoriesCount,
    itemsCount,
    tablesCount,
    ordersToday,
    revenueTodayAgg,
    inKitchenCount,
    guestCallsCount,
    recentOrders,
  ] = await prisma.$transaction(
    async (tx) =>
      Promise.all([
        tx.restaurant.findUnique({
          where: { id: restaurantId },
          select: restaurantBrandingSelect,
        }),
        tx.menuCategory.count({ where: { restaurantId } }),
        tx.menuItem.count({ where: { category: { restaurantId } } }),
        tx.table.count({ where: { restaurantId } }),
        tx.order.count({
          where: { restaurantId, createdAt: { gte: todayStart } },
        }),
        tx.order.aggregate({
          where: {
            restaurantId,
            createdAt: { gte: todayStart },
            status: { in: CONFIRMED_STATUSES },
          },
          _sum: { totalAmount: true },
        }),
        tx.order.count({
          where: { restaurantId, status: { in: ["preparing", "ready"] } },
        }),
        tx.table.count({
          where: { restaurantId, waiterCalledAt: { not: null } },
        }),
        access.orders
          ? tx.order.findMany({
              where: { restaurantId },
              orderBy: { createdAt: "desc" },
              take: 6,
              select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                table: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
      ]),
    { maxWait: 10_000, timeout: 20_000 },
  );

  const restaurantName =
    restaurant?.name ?? session.user.restaurantName ?? "Your restaurant";
  const ordersNav =
    restaurant?.navLabelOrdersQueue?.trim() || "Orders";
  const waiterNav =
    restaurant?.navLabelGuestOrders?.trim() || "Waiter";

  const salesTodayCents = revenueTodayAgg._sum.totalAmount ?? 0;
  const needsSetup = itemsCount === 0 || tablesCount === 0;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Overview</h1>
        <p className="text-lg font-medium text-ink">{restaurantName}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Snapshot of today&apos;s activity, your menu setup, and shortcuts to every area of the dashboard.
        </p>
        {access.office ? (
          <div className="pt-2">
            <Link
              href="/dashboard/office"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:opacity-95"
            >
              Open Office — sales, team &amp; reports
            </Link>
          </div>
        ) : null}
      </header>

      {(access.orders || access.waitStaff) && (
        <section aria-labelledby="pulse-heading">
          <h2 id="pulse-heading" className="text-base font-semibold text-ink mb-3">
            Right now
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {access.orders ? (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-ink/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Sales today
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {fmtUsd(salesTodayCents)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Confirmed orders only</p>
              </div>
            ) : null}
            {access.orders ? (
              <Link
                href="/dashboard/orders"
                className="rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-ink/[0.04] transition hover:border-primary/30 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  In {ordersNav.toLowerCase()}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{inKitchenCount}</p>
                <p className="mt-1 text-xs text-ink-muted">Preparing or ready</p>
              </Link>
            ) : null}
            {access.waitStaff ? (
              <Link
                href="/dashboard/wait-staff"
                className={`rounded-2xl border p-5 shadow-sm ring-1 transition hover:shadow-md ${
                  guestCallsCount > 0
                    ? "border-violet-400/70 bg-violet-50 ring-violet-200/50 hover:border-violet-500 dark:border-violet-600/50 dark:bg-violet-950/40 dark:ring-violet-900/40"
                    : "border-border bg-card ring-ink/[0.04] hover:border-primary/30"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Guest calls
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-violet-800 dark:text-violet-200">
                  {guestCallsCount}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {waiterNav} → table calls
                </p>
              </Link>
            ) : null}
          </div>
        </section>
      )}

      {(access.menu || access.tables || access.orders) ? (
      <section aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-base font-semibold text-ink mb-3">
          Menu &amp; floor
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {access.menu ? (
            <Link
              href="/dashboard/menu"
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
            >
              <p className="text-sm font-medium text-ink-muted">Categories</p>
              <p className="text-3xl font-bold text-ink mt-1">{categoriesCount}</p>
              <p className="text-xs text-ink-muted mt-2 group-hover:text-primary">
                Manage menu sections →
              </p>
            </Link>
          ) : null}
          {access.menu ? (
            <Link
              href="/dashboard/menu"
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
            >
              <p className="text-sm font-medium text-ink-muted">Menu items</p>
              <p className="text-3xl font-bold text-ink mt-1">{itemsCount}</p>
              <p className="text-xs text-ink-muted mt-2 group-hover:text-primary">
                Dishes &amp; drinks →
              </p>
            </Link>
          ) : null}
          {access.tables ? (
            <Link
              href="/dashboard/tables"
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
            >
              <p className="text-sm font-medium text-ink-muted">Tables</p>
              <p className="text-3xl font-bold text-ink mt-1">{tablesCount}</p>
              <p className="text-xs text-ink-muted mt-2 group-hover:text-primary">
                QR codes &amp; names →
              </p>
            </Link>
          ) : null}
          {access.orders ? (
            <Link
              href="/dashboard/orders"
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
            >
              <p className="text-sm font-medium text-ink-muted">Orders today</p>
              <p className="text-3xl font-bold text-ink mt-1">{ordersToday}</p>
              <p className="text-xs text-ink-muted mt-2 group-hover:text-primary">
                All statuses →
              </p>
            </Link>
          ) : null}
        </div>
        {needsSetup && (access.menu || access.tables) ? (
          <div className="mt-4 rounded-2xl border border-border bg-primary/[0.06] px-4 py-3 text-sm text-ink">
            <p className="font-semibold">Finish setup</p>
            <p className="mt-1 text-ink-muted">
              {itemsCount === 0 && access.menu
                ? "Add categories and items so guests see a menu. "
                : null}
              {tablesCount === 0 && access.tables
                ? "Add tables so each QR links to the right place. "
                : null}
            </p>
          </div>
        ) : null}
      </section>
      ) : null}

      {access.orders && recentOrders.length > 0 ? (
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="recent-heading" className="text-base font-semibold text-ink">
              Recent orders
            </h2>
            <Link
              href="/dashboard/orders"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href="/dashboard/orders"
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{o.table.name}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(o.createdAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {" · "}
                        <span className="capitalize">{statusLabel(o.status)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                      {fmtUsd(o.totalAmount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
