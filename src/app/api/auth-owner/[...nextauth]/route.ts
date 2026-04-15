import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptionsOwner } from "@/lib/auth";
import { applyDualAuthRedirectFix } from "@/lib/next-auth-app-route-response";

const nextAuthHandler = NextAuth(authOptionsOwner);

async function wrappedHandler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    const res = await nextAuthHandler(req, context);
    return await applyDualAuthRedirectFix(res, req, "owner");
  } catch (error) {
    console.error("[next-auth owner] Route handler error:", error);
    return NextResponse.json({ error: "Authentication error" }, { status: 500 });
  }
}

export const GET = wrappedHandler;
export const POST = wrappedHandler;
