import { NextRequest, NextResponse } from "next/server";
import { getDashboardServerSession } from "@/lib/auth-server";

/** JSON session for the dashboard client (merges owner + staff cookies by path). */
export async function GET(req: NextRequest) {
  const session = await getDashboardServerSession(req);
  return NextResponse.json(session);
}
