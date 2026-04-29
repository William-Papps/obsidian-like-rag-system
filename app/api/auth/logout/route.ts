import { NextResponse } from "next/server";
import { logoutUserWithResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.headers.set("cache-control", "no-store");
  return logoutUserWithResponse(request, response);
}
