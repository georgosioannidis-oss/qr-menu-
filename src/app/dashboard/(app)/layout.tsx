/**
 * Authenticated dashboard shell: nav, restaurant name, CSS variables for primary color (light theme default).
 * Middleware already ensures a session exists for /dashboard/* except /dashboard/login.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardAccountMenu } from "@/components/DashboardAccountMenu";
import { DashboardSessionProvider } from "@/components/DashboardSessionProvider";
import { getDashboardServerSession } from "@/lib/auth-server";
import {
  getCachedRestaurantBranding,
  getCachedRestaurantUserDashboardRow,
} from "@/lib/dashboard-request-cache";
import { normalizePublicMediaUrl } from "@/lib/media-url";
import { darkenHex } from "@/lib/theme";
import { DashboardNavDesktop, DashboardNavMobile } from "../DashboardNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDashboardServerSession();
  const restaurantId = session?.user?.restaurantId;
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  const [account, restaurant] = await Promise.all([
    sessionUserId
      ? getCachedRestaurantUserDashboardRow(sessionUserId).catch(() => null)
      : Promise.resolve(null),
    restaurantId
      ? getCachedRestaurantBranding(restaurantId).catch(() => null)
      : Promise.resolve(null),
  ]);

  let sessionRole: string | undefined;
  let sessionPermissions: unknown;
  if (account) {
    if (
      account.disabled ||
      (restaurantId && account.restaurantId !== restaurantId)
    ) {
      redirect("/dashboard/login?accountDisabled=1");
    }
    if (!account.disabled) {
      sessionRole = account.role;
      sessionPermissions = account.permissions ?? undefined;
    }
  }

  const logoSrc = normalizePublicMediaUrl(restaurant?.logoUrl ?? undefined);

  const primary = restaurant?.primaryColor ?? "#C15C2A";
  const primaryHover = restaurant?.primaryColor ? darkenHex(restaurant.primaryColor) : "#A04A22";
  const mode = restaurant?.colorMode === "dark" ? "dark" : "light";
  const themeStyle: React.CSSProperties = {
    ["--primary" as string]: primary,
    ["--primary-hover" as string]: primaryHover,
    ...(mode === "dark"
      ? {
          ["--surface" as string]: "#0a0a0a",
          ["--card" as string]: "#171717",
          ["--ink" as string]: "#fafafa",
          ["--ink-muted" as string]: "#a3a3a3",
          ["--border" as string]: "rgba(255,255,255,0.12)",
        }
      : {
          ["--surface" as string]: "#f5f5f5",
          ["--card" as string]: "#ffffff",
          ["--ink" as string]: "#171717",
          ["--ink-muted" as string]: "#525252",
          ["--border" as string]: "rgba(0,0,0,0.1)",
        }),
  };

  return (
    <DashboardSessionProvider initialSession={session}>
    <div
      className="dashboard-theme-root group/dashboard min-h-screen bg-surface text-ink"
      data-theme={mode}
      style={themeStyle}
    >
      <header className={`sticky top-0 z-10 border-b shadow-sm ${mode === "dark" ? "bg-card border-border" : "bg-card border-border"}`}>
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-1">
            <div className="min-w-0 flex flex-1 flex-col gap-2 lg:max-w-[min(100%,28rem)] lg:flex-none">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href="/dashboard"
                  prefetch
                  className={`flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center gap-2 break-words text-lg font-bold leading-tight tracking-tight lg:min-h-0 ${mode === "dark" ? "text-white" : "text-ink"}`}
                >
                  {logoSrc ? (
                    <>
                      <img
                        src={logoSrc}
                        alt=""
                        className="h-8 w-auto max-w-[120px] object-contain object-left"
                      />
                      <span className="min-w-0 sm:inline">{restaurant?.name ?? ""}</span>
                    </>
                  ) : (
                    restaurant?.name ?? session?.user?.restaurantName ?? "Dashboard"
                  )}
                </Link>
                <div className="shrink-0 lg:hidden">
                  <DashboardAccountMenu />
                </div>
              </div>
              <div className="lg:hidden">
                <DashboardNavMobile
                  sessionRole={sessionRole}
                  sessionPermissions={sessionPermissions}
                  staffMayEditMenuTables={restaurant?.staffMayEditMenuTables === true}
                  navLabelOrders={restaurant?.navLabelOrdersQueue?.trim() || "Orders"}
                  navLabelGuestOrders={restaurant?.navLabelGuestOrders?.trim() || "Waiter"}
                />
              </div>
            </div>
            <DashboardNavDesktop
              sessionRole={sessionRole}
              sessionPermissions={sessionPermissions}
              staffMayEditMenuTables={restaurant?.staffMayEditMenuTables === true}
              navLabelOrders={restaurant?.navLabelOrdersQueue?.trim() || "Orders"}
              navLabelGuestOrders={restaurant?.navLabelGuestOrders?.trim() || "Waiter"}
            />
          </div>
        </div>
      </header>
      <main className="dashboard-copy mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 bg-surface">
        {children}
      </main>
    </div>
    </DashboardSessionProvider>
  );
}
