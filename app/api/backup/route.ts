import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { exportDatabaseBuffer } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async () => {
    const buffer = await exportDatabaseBuffer();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": "application/x-sqlite3",
        "content-disposition": `attachment; filename="eternalnotes-backup-${stamp}.db"`
      }
    });
  });
}
