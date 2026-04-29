import { NextResponse } from "next/server";
import { logoutUserWithResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return logoutUserWithResponse(request, NextResponse.json({ success: true }));
}
