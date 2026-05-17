"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HealthStatus = {
  ollama_reachable: boolean;
  model_loaded: boolean;
  ready: boolean;
};

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<HealthStatus>({ ollama_reachable: false, model_loaded: false, ready: false });
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/health");
        const data: HealthStatus = await res.json();
        if (!cancelled) setStatus(data);
        if (data.ready) {
          router.replace("/");
          return;
        }
      } catch {
        // Ollama not reachable yet
      }
      if (!cancelled) setTimeout(check, 3000);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[16px]" style={{ background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)" }}>
        <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
          <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
        </svg>
      </div>

      <h1 className="mb-3 text-[28px] font-semibold text-white">
        AI models loading{dots}
      </h1>
      <p className="mb-8 max-w-sm text-[15px] leading-[1.6] text-white/50">
        First launch takes 5–20 minutes while models download (~3 GB). This only happens once.
      </p>

      <div className="mb-8 w-full max-w-xs space-y-3">
        <StatusRow label="Ollama" done={status.ollama_reachable} />
        <StatusRow label="Embedding model" done={status.model_loaded} />
        <StatusRow label="App" done={status.ready} />
      </div>

      <p className="text-[13px] text-white/30">
        Watch download progress:{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-white/50">
          docker compose logs -f init-models
        </code>
      </p>
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
      <div className={`h-2 w-2 rounded-full ${done ? "bg-green-400" : "animate-pulse bg-white/20"}`} />
      <span className="text-[14px] text-white/60">{label}</span>
      <span className="ml-auto text-[12px] text-white/30">{done ? "ready" : "waiting"}</span>
    </div>
  );
}
