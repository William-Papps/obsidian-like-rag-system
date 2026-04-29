import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  name,
  description,
  features,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="h-screen flex items-center justify-center bg-ink-950">
      <div className="max-w-sm w-full text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-ink-925 border border-ink-875 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-7 h-7 text-accent-400" />
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-[11px] font-semibold tracking-wide mb-4">
          Coming Soon
        </span>
        <h1 className="text-xl font-bold text-ink-100 mb-2">{name}</h1>
        <p className="text-sm text-ink-500 leading-6 mb-6">{description}</p>
        <ul className="text-left space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
              <span className="mt-2 w-1 h-1 rounded-full bg-accent-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
