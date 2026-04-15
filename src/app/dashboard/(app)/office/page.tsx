import { redirect } from "next/navigation";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { getDashboardServerSession } from "@/lib/auth-server";
import { isDatabaseConnectionError } from "@/lib/database-connection-error";
import { prisma } from "@/lib/prisma";
import { defaultDashboardHome, resolveDashboardAccess } from "@/lib/staff-permissions";
import { staffJoinUrl } from "@/lib/staff-invite-url";

function OfficeSectionSkeleton({ minHeight = "8rem" }: { minHeight?: string }) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-border bg-ink/[0.04]"
      style={{ minHeight }}
      aria-hidden
    />
  );
}

const OfficeStaffShell = nextDynamic(() =>
  import("./OfficeStaffShell").then((m) => m.OfficeStaffShell),
  { loading: () => <OfficeSectionSkeleton minHeight="6rem" /> }
);

/** Prisma `in` expects a mutable string[] (not readonly tuple). */
const CONFIRMED_STATUSES = ["paid", "preparing", "ready", "delivered"] as string[];

export const dynamic = "force-dynamic";

function fmtUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function employeeDisplayName(u: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const n = [u.firstName?.trim(), u.lastName?.trim()].filter(Boolean).join(" ");
  return n || u.email;
}

function OfficeDatabaseUnavailable() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-bold text-ink">Office</h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        The app can&apos;t reach your database right now. This usually means Supabase is paused, your{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 text-xs text-ink group-data-[theme=dark]/dashboard:bg-white/10">
          DATABASE_URL
        </code>{" "}
        in{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 text-xs text-ink group-data-[theme=dark]/dashboard:bg-white/10">
          .env
        </code>{" "}
        is wrong, or your network is blocking the connection.
      </p>
      <ul className="list-inside list-disc text-sm text-ink-muted">
        <li>Open Supabase → restore the project if it shows as paused.</li>
        <li>Copy a fresh connection string from Settings → Database.</li>
        <li>Restart <code className="text-xs">npm run dev</code> after changing <code className="text-xs">.env</code>.</li>
      </ul>
      <p className="text-sm text-ink-muted">
        <Link href="/dashboard" className="font-semibold text-primary hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}

async function loadOfficePageData(
  restaurantId: string,
  todayStart: Date,
  d7: Date,
  d30: Date
) {
  const recentInclude = {
    table: { select: { name: true } },
    items: { take: 4, include: { menuItem: { select: { name: true } } } },
  } as const;

  const [
    aggToday,
    agg7,
    agg30,
    pendingUnpaid,
    statusBreakdown,
    bestSellers,
    recentOrders,
    restaurantPrefs,
    employees,
    staffInvitesRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        restaurantId,
        status: { in: CONFIRMED_STATUSES },
        createdAt: { gte: todayStart },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        status: { in: CONFIRMED_STATUSES },
        createdAt: { gte: d7 },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        status: { in: CONFIRMED_STATUSES },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.count({
      where: { restaurantId, status: "pending" },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: d30 } },
      _count: true,
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: {
          restaurantId,
          status: { in: CONFIRMED_STATUSES },
          createdAt: { gte: d30 },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: recentInclude,
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { staffMayEditMenuTables: true },
    }),
    prisma.restaurantUser.findMany({
      where: { restaurantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        disabled: true,
        title: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    prisma.staffInvite.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        token: true,
        role: true,
        permissions: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        usedByEmail: true,
      },
    }),
  ]);

  const itemIds = bestSellers.map((b) => b.menuItemId);
  const items =
    itemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = Object.fromEntries(items.map((i) => [i.id, i.name]));

  const inviteNow = new Date();
  const staffInvitesInitial = await Promise.all(
    staffInvitesRaw.map(async (i) => {
      const invitePageUrl = await staffJoinUrl(i.token);
      return {
        id: i.id,
        role: i.role,
        permissions: i.permissions,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString() ?? null,
        usedByEmail: i.usedByEmail ?? null,
        invitePageUrl,
        joinUrl: !i.usedAt && i.expiresAt > inviteNow ? invitePageUrl : null,
      };
    })
  );

  return {
    aggToday,
    agg7,
    agg30,
    pendingUnpaid,
    statusBreakdown,
    bestSellers,
    recentOrders,
    restaurantPrefs,
    employees,
    staffInvitesInitial,
    nameById,
  };
}

export default async function OfficePage() {
  const session = await getDashboardServerSession();
  if (!session?.user?.restaurantId) redirect("/dashboard/login");
  const uid = (session.user as { id?: string }).id;
  if (!uid) redirect("/dashboard/login");

  const selfRow = await prisma.restaurantUser.findFirst({
    where: { id: uid, restaurantId: session.user.restaurantId },
    select: { role: true, permissions: true },
  });
  const selfAccess = resolveDashboardAccess(
    selfRow ?? { role: session.user.role ?? "", permissions: null }
  );
  if (!selfAccess.office && !selfAccess.isTrueOwner) {
    redirect(defaultDashboardHome(selfAccess));
  }

  const restaurantId = session.user.restaurantId;
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);

  let data: Awaited<ReturnType<typeof loadOfficePageData>>;
  try {
    data = await loadOfficePageData(restaurantId, todayStart, d7, d30);
  } catch (e) {
    if (isDatabaseConnectionError(e)) {
      return <OfficeDatabaseUnavailable />;
    }
    throw e;
  }

  const {
    aggToday,
    agg7,
    agg30,
    pendingUnpaid,
    statusBreakdown,
    bestSellers,
    recentOrders,
    restaurantPrefs,
    employees,
    staffInvitesInitial,
    nameById,
  } = data;

  const revenueToday = aggToday._sum?.totalAmount ?? 0;
  const revenue7 = agg7._sum?.totalAmount ?? 0;
  const revenue30 = agg30._sum?.totalAmount ?? 0;
  const countToday = Number(aggToday._count ?? 0);
  const count7 = Number(agg7._count ?? 0);
  const count30 = Number(agg30._count ?? 0);

  const avgOrderCents30 = count30 > 0 ? Math.round(revenue30 / count30) : 0;

  const statusOrder = ["pending", "paid", "preparing", "ready", "delivered", "declined"];
  const breakdownSorted = [...statusBreakdown].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  const currentUserId = (session.user as { id?: string }).id ?? "";

  const nameByEmail = Object.fromEntries(
    employees.map((u) => [u.email.trim().toLowerCase(), employeeDisplayName(u)])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-wrap-pretty text-2xl font-bold text-ink mb-2">Office</h1>
        <p className="text-wrap-pretty text-ink-muted">
          Revenue and orders first. Team, invites, and menu access are in Manage team at the bottom.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted mb-3">Revenue</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-ink-muted">Today</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{fmtUsd(revenueToday)}</p>
            <p className="mt-1 text-xs text-ink-muted">{countToday} orders</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-ink-muted">Last 7 days</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{fmtUsd(revenue7)}</p>
            <p className="mt-1 text-xs text-ink-muted">{count7} orders</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-primary/15">
            <p className="text-sm font-medium text-ink-muted">Last 30 days</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{fmtUsd(revenue30)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {count30} orders · avg {fmtUsd(avgOrderCents30)} / order
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted mb-4">Best sellers (30 days)</h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {bestSellers.length === 0 ? (
              <p className="p-6 text-sm text-ink-muted">No sales in the last 30 days.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bestSellers.map((row, i) => (
                  <li key={row.menuItemId} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="min-w-0 max-w-full line-clamp-2 break-words font-medium leading-snug text-ink">
                        {nameById[row.menuItemId] ?? "Unknown item"}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                      {row._sum.quantity ?? 0} sold
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted mb-3">By status · 30d</h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {breakdownSorted.map((row) => (
                <li key={row.status} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium capitalize text-ink">{row.status}</span>
                  <span className="tabular-nums text-ink-muted">{row._count} orders</span>
                </li>
              ))}
            </ul>
            {pendingUnpaid > 0 && (
              <p className="border-t border-border bg-ink/[0.03] px-4 py-3 text-xs text-ink-muted">
                {pendingUnpaid} unpaid pending — not in revenue.
              </p>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Recent</h2>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-primary hover:underline">
            All orders
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Table</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((o) => (
                <tr key={o.id} className="text-ink">
                  <td className="px-4 py-3 tabular-nums text-ink-muted">
                    {o.createdAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{o.table.name}</td>
                  <td className="px-4 py-3 capitalize">{o.status}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{fmtUsd(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <p className="p-6 text-sm text-ink-muted">No orders yet.</p>
          )}
        </div>
      </section>

      <OfficeStaffShell
        staffMayEditMenuTables={restaurantPrefs?.staffMayEditMenuTables === true}
        initialInvites={staffInvitesInitial}
        initialUsers={employees.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        inviteNameByEmail={nameByEmail}
        currentUserId={currentUserId}
      />
    </div>
  );
}
