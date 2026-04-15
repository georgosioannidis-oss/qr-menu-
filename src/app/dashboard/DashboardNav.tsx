"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardAccountMenu } from "@/components/DashboardAccountMenu";
import { useDashboardSession } from "@/components/DashboardSessionProvider";
import {
  hasKitchenQueueAccess,
  hasWaitStaffAccess,
  STAFF_GRANULAR_ROLE,
} from "@/lib/dashboard-roles";
import {
  type DashboardSectionId,
  resolveDashboardAccess,
} from "@/lib/staff-permissions";

type NavLink = { href: string; label: string; section: DashboardSectionId };

function buildLinks(labelOrders: string, labelGuest: string): NavLink[] {
  return [
    { href: "/dashboard", label: "Overview", section: "overview" },
    { href: "/dashboard/menu", label: "Menu", section: "menu" },
    { href: "/dashboard/tables", label: "Tables", section: "tables" },
    { href: "/dashboard/stations", label: "Stations", section: "stations" },
    { href: "/dashboard/wait-staff", label: labelGuest, section: "waitStaff" },
    { href: "/dashboard/orders", label: labelOrders, section: "orders" },
    { href: "/dashboard/office", label: "Office", section: "office" },
    { href: "/dashboard/branding", label: "Options", section: "branding" },
  ];
}

function linkClassName(isActive: boolean, block = false) {
  const base = block
    ? "flex w-full min-h-[48px] items-center rounded-xl px-4 py-3 text-base font-semibold transition-colors "
    : "min-h-[44px] inline-flex items-center px-3 py-2 rounded-lg text-base font-medium leading-snug transition-colors lg:min-h-[40px] lg:text-sm ";
  if (isActive) return `${base}bg-primary/10 text-primary`;
  return `${base}text-ink-muted hover:bg-ink/5 hover:text-ink`;
}

export type DashboardNavProps = {
  staffMayEditMenuTables?: boolean;
  navLabelOrders?: string;
  navLabelGuestOrders?: string;
  sessionRole?: string;
  sessionPermissions?: unknown;
};

function useDashboardNavModel({
  staffMayEditMenuTables = false,
  navLabelOrders = "Orders",
  navLabelGuestOrders = "Waiter",
  sessionRole,
  sessionPermissions,
}: DashboardNavProps) {
  const pathname = usePathname();
  const { session } = useDashboardSession();
  const role = sessionRole ?? session?.user?.role ?? "";
  const permissions = sessionPermissions ?? (session?.user as { permissions?: unknown })?.permissions;
  const access = resolveDashboardAccess({ role, permissions });

  const legacyStaff =
    (hasKitchenQueueAccess(role) || hasWaitStaffAccess(role)) &&
    role !== STAFF_GRANULAR_ROLE;

  const links = useMemo(
    () => buildLinks(navLabelOrders, navLabelGuestOrders),
    [navLabelOrders, navLabelGuestOrders]
  );

  const visible = useMemo(
    () =>
      links.filter((l) => {
        if (l.section === "menu") {
          if (access.menu) return true;
          if (legacyStaff && staffMayEditMenuTables) return true;
          return false;
        }
        if (l.section === "tables") {
          if (access.tables) return true;
          if (legacyStaff && staffMayEditMenuTables) return true;
          return false;
        }
        if (l.section === "stations") {
          if (access.stations) return true;
          if (legacyStaff && staffMayEditMenuTables) return true;
          return false;
        }
        return Boolean(access[l.section]);
      }),
    [access, legacyStaff, links, staffMayEditMenuTables]
  );

  const linkActive = useCallback(
    (href: string) =>
      pathname === href ||
      (href === "/dashboard/office" && pathname.startsWith("/dashboard/office")) ||
      (href === "/dashboard/wait-staff" && pathname.startsWith("/dashboard/wait-staff")) ||
      (href !== "/dashboard" &&
        href !== "/dashboard/office" &&
        href !== "/dashboard/wait-staff" &&
        pathname.startsWith(href)),
    [pathname]
  );

  return { visible, linkActive };
}

/** Hamburger + drawer only — place under the restaurant name on small screens. */
export function DashboardNavMobile(props: DashboardNavProps) {
  const { visible, linkActive } = useDashboardNavModel(props);
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-border bg-card px-3 text-ink shadow-sm"
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
      >
        <span className="sr-only">Open navigation</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Dashboard navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close navigation"
            onClick={closeDrawer}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(20rem,90vw)] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-base font-bold text-ink">Dashboard</span>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink hover:bg-ink/5"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {visible.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onClick={closeDrawer}
                  className={linkClassName(linkActive(href), true)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Horizontal links + account — visible from `lg` so mid-width viewports are not cramped. */
export function DashboardNavDesktop(props: DashboardNavProps) {
  const { visible, linkActive } = useDashboardNavModel(props);

  return (
    <nav className="hidden w-full min-w-0 flex-wrap items-center justify-end gap-1 lg:flex lg:gap-2">
      {visible.map(({ href, label }) => (
        <Link key={href} href={href} prefetch className={linkClassName(linkActive(href))}>
          {label}
        </Link>
      ))}
      <div className="ml-1 lg:ml-2">
        <DashboardAccountMenu />
      </div>
    </nav>
  );
}
