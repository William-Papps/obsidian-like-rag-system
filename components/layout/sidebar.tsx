"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import {
  BookOpen,
  MessageSquare,
  Hash,
  Code2,
  ArrowLeftRight,
  FileJson,
  FileText,
  FileSearch,
  Zap,
  Bug,
  Webhook,
  Settings,
  LogOut,
  Pin,
  PinOff,
} from "lucide-react";

type NavItem = { href: string; icon: React.ElementType; label: string };

const mainTools: NavItem[] = [
  { href: "/notes", icon: BookOpen, label: "Notes" },
  { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  { href: "/regex", icon: Hash, label: "Regex Tester" },
  { href: "/json", icon: FileJson, label: "JSON Tools" },
  { href: "/markdown", icon: FileText, label: "Markdown" },
];

const devTools: NavItem[] = [
  { href: "/code-explain", icon: Code2, label: "Code Explainer" },
  { href: "/code-convert", icon: ArrowLeftRight, label: "Converter" },
  { href: "/files", icon: FileSearch, label: "File Analyzer" },
  { href: "/prompts", icon: Zap, label: "Prompt Builder" },
  { href: "/debug", icon: Bug, label: "Debug Helper" },
  { href: "/api-tester", icon: Webhook, label: "API Tester" },
];

function NavLink({
  item,
  pathname,
  open,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
}) {
  const active =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={!open ? item.label : undefined}
      className={clsx(
        "flex items-center gap-2.5 rounded-md px-2 py-[7px] transition-colors text-[13px] font-medium",
        active
          ? "bg-accent-500/15 text-accent-400"
          : "text-ink-500 hover:bg-ink-875 hover:text-ink-300"
      )}
    >
      <Icon className="w-[15px] h-[15px] shrink-0" />
      {open && <span className="whitespace-nowrap">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: open ? 208 : 52 }}
      className="fixed left-0 top-0 z-40 h-screen flex flex-col bg-ink-950 border-r border-ink-875 transition-[width] duration-200 ease-out overflow-hidden"
    >
      {/* Logo */}
      <div className="h-11 flex items-center gap-2.5 px-[14px] border-b border-ink-875 shrink-0">
        <div className="w-6 h-6 rounded-md bg-accent-500 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-white select-none">E</span>
        </div>
        {open && (
          <>
            <span className="text-[13px] font-semibold text-ink-100 whitespace-nowrap flex-1 min-w-0">
              EternalNotes
            </span>
            <button
              onClick={() => setPinned((p) => !p)}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              className="shrink-0 text-ink-700 hover:text-ink-400 transition-colors"
            >
              {pinned ? (
                <PinOff className="w-3.5 h-3.5" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 flex flex-col gap-0.5">
        {mainTools.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} open={open} />
        ))}

        <div className="my-1 mx-1 border-t border-ink-875" />

        {open && (
          <p className="px-2 pt-0.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-700">
            Dev Tools
          </p>
        )}

        {devTools.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} open={open} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-ink-875 py-2 px-1.5 flex flex-col gap-0.5">
        <NavLink
          item={{ href: "/settings", icon: Settings, label: "Settings" }}
          pathname={pathname}
          open={open}
        />
        <button
          onClick={onLogout}
          title={!open ? "Sign out" : undefined}
          className="flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] font-medium text-ink-500 hover:bg-danger-400/10 hover:text-danger-400 transition-colors"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          {open && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
