import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const nextAuthHandler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    return await nextAuthHandler(req, context);
  } catch (error) {
    console.error("[next-auth] Route handler error:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

export const GET = wrappedHandler;
export const POST = wrappedHandler;
