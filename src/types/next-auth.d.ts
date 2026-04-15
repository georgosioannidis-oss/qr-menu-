import "next-auth";

declare module "next-auth" {
  /** Supported at runtime in next-auth v4+ (e.g. Vercel / dynamic hosts); default types omit it. */
  interface AuthOptions {
    trustHost?: boolean;
  }

  interface User {
    id?: string;
    restaurantId?: string;
    restaurantName?: string;
    role?: string;
    permissions?: unknown;
    firstName?: string | null;
    lastName?: string | null;
  }

  interface Session {
    /** Which NextAuth cookie this session came from (owner vs staff). */
    dashboardAuthChannel?: "owner" | "staff";
    user: User & {
      id?: string;
      restaurantId?: string;
      restaurantName?: string;
      role?: string;
      permissions?: unknown;
      firstName?: string | null;
      lastName?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string;
    restaurantId?: string;
    restaurantName?: string;
    role?: string;
    permissions?: unknown;
    firstName?: string | null;
    lastName?: string | null;
  }
}
