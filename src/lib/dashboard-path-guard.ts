import { resolveDashboardAccess, pathNotAllowedRedirect } from "./staff-permissions";

/**
 * If the user must not stay on `pathname`, returns the path to redirect to.
 * Uses **current** role + permissions from the database — must not use JWT alone (it can be stale).
 */
export function dashboardPathRedirect(
  pathname: string,
  role: string,
  permissions?: unknown
): string | null {
  const access = resolveDashboardAccess({ role, permissions });
  return pathNotAllowedRedirect(pathname, access);
}
