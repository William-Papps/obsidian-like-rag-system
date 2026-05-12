import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demoMode: process.env.DEMO_MODE === "true"
  });
}
