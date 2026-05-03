import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { buildStudyPlan } from "@/lib/services/study-plan";
import { getRecentPerformance } from "@/lib/services/learning-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const [items, performance] = await Promise.all([
      buildStudyPlan(user.id),
      getRecentPerformance(user.id)
    ]);
    return NextResponse.json({ items, performance });
  });
}
