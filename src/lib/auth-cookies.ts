/** Separate NextAuth cookie namespaces so owner and staff sessions can coexist in one browser. */

export type AuthChannel = "owner" | "staff";

export function shouldUseSecureAuthCookies(): boolean {
  const url = process.env.NEXTAUTH_URL ?? "";
  if (url.startsWith("https://")) return true;
  if (process.env.VERCEL === "1") return true;
  return false;
}

function cookiePrefix(secure: boolean): string {
  return secure ? "__Secure-" : "";
}

/** Session JWT cookie names (must match `getToken({ cookieName })` and NextAuth `cookies` config). */
export function sessionTokenCookieName(channel: AuthChannel): string {
  const secure = shouldUseSecureAuthCookies();
  return `${cookiePrefix(secure)}next-auth.${channel}.session-token`;
}

export function buildChannelCookies(channel: AuthChannel) {
  const useSecureCookies = shouldUseSecureAuthCookies();
  const p = cookiePrefix(useSecureCookies);
  const ch = channel;
  return {
    sessionToken: {
      name: `${p}next-auth.${ch}.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${p}next-auth.${ch}.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${p}next-auth.${ch}.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${p}next-auth.${ch}.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: `${p}next-auth.${ch}.state`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: `${p}next-auth.${ch}.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
  };
}
