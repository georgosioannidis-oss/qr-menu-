/**
 * NextAuth configuration for restaurant staff (dashboard).
 * Owner and staff use separate JWT cookies so logging in on Team does not replace Owner in another tab.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { buildChannelCookies } from "./auth-cookies";
import { prisma } from "./prisma";
import { isOwnerRole, isEmailStaffRole } from "./dashboard-roles";

const sharedCallbacks: NextAuthOptions["callbacks"] = {
  async jwt({ token, user }) {
    if (user) {
      token.email = user.email ?? undefined;
      token.restaurantId = user.restaurantId;
      token.restaurantName = (user as { restaurantName?: string }).restaurantName;
      token.role = (user as { role?: string }).role;
      token.permissions = (user as { permissions?: unknown }).permissions ?? undefined;
      token.firstName = (user as { firstName?: string | null }).firstName ?? null;
      token.lastName = (user as { lastName?: string | null }).lastName ?? null;
    } else if (token.sub) {
      try {
        const dbUser = await prisma.restaurantUser.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            disabled: true,
            permissions: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        if (dbUser && !dbUser.disabled) {
          token.role = dbUser.role;
          token.permissions = dbUser.permissions ?? undefined;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.email = dbUser.email;
        }
      } catch {
        /* keep existing token.role */
      }
    }
    return token;
  },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub!;
        if (token.email) session.user.email = token.email as string;
        (session.user as { restaurantId?: string }).restaurantId = token.restaurantId as string;
        (session.user as { restaurantName?: string }).restaurantName = token.restaurantName as string;
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { permissions?: unknown }).permissions = token.permissions;
        (session.user as { firstName?: string | null }).firstName = token.firstName ?? null;
        (session.user as { lastName?: string | null }).lastName = token.lastName ?? null;
      }
      return session;
    },
};

const sharedSessionPages: Pick<NextAuthOptions, "session" | "pages"> = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/dashboard/login" },
};

const sharedSecret: Pick<NextAuthOptions, "secret" | "trustHost"> = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const authOptionsOwner: NextAuthOptions = {
  ...sharedSecret,
  ...sharedSessionPages,
  cookies: buildChannelCookies("owner"),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        restaurantSlug: { label: "Restaurant slug", type: "text" },
        loginMode: { label: "Login mode", type: "text" },
      },
      async authorize(credentials) {
        const password = credentials?.password;
        if (!password) return null;
        if (credentials?.loginMode !== "owner") return null;

        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;

        const user = await prisma.restaurantUser.findUnique({
          where: { email },
          include: { restaurant: true },
        });
        if (!user || !(await compare(password, user.passwordHash))) return null;
        if (user.disabled) return null;
        if (!isOwnerRole(user.role)) return null;

        return {
          id: user.id,
          email: user.email,
          restaurantId: user.restaurantId,
          restaurantName: user.restaurant.name,
          role: user.role,
          permissions: user.permissions ?? undefined,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: sharedCallbacks,
};

export const authOptionsStaff: NextAuthOptions = {
  ...sharedSecret,
  ...sharedSessionPages,
  cookies: buildChannelCookies("staff"),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        restaurantSlug: { label: "Restaurant slug", type: "text" },
        loginMode: { label: "Login mode", type: "text" },
      },
      async authorize(credentials) {
        const password = credentials?.password;
        if (!password) return null;

        const mode = credentials?.loginMode;
        if (mode !== "wait_staff") return null;

        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.restaurantUser.findUnique({
          where: { email },
          include: { restaurant: true },
        });
        if (!user || !isEmailStaffRole(user.role)) return null;
        if (!(await compare(password, user.passwordHash))) return null;
        if (user.disabled) return null;
        return {
          id: user.id,
          email: user.email,
          restaurantId: user.restaurantId,
          restaurantName: user.restaurant.name,
          role: user.role,
          permissions: user.permissions ?? undefined,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: sharedCallbacks,
};

/** @deprecated Use authOptionsOwner / authOptionsStaff. Kept for any legacy imports. */
export const authOptions = authOptionsOwner;

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV !== "test") {
  console.warn(
    "Warning: NEXTAUTH_SECRET is not set. Dashboard login will not work. Add it to your .env file (e.g. run: openssl rand -base64 32)"
  );
}
