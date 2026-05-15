"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function DiscordVerifyError() {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 py-10 text-frost">
      <div className="w-full max-w-md rounded-[16px] border border-graphite-rail bg-[#0b0e14] p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-4 text-[20px] font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-fog">
          The verification page failed to load. Try clicking the link from Discord again, or go back to the workspace.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-[6px] border border-graphite-rail px-5 py-2.5 text-[14px] font-medium text-frost transition-colors hover:border-smoke"
          >
            Go to workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
