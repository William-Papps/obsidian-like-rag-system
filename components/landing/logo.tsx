import type { CSSProperties } from "react";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-ink-750/50 bg-ink-925/80 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      style={
        {
          width: size,
          height: size,
          ["--glow" as keyof CSSProperties]: "rgb(var(--accent-400) / 0.22)"
        } as CSSProperties
      }
    >
      <div className="absolute opacity-0" />
      <svg width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} viewBox="0 0 16 16" fill="none">
        <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="rgb(248 248 252 / 0.92)" />
      </svg>
    </div>
  );
}

