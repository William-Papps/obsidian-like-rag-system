"use client";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  function logout() {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(
      () => {
        window.location.href = "/auth";
      }
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar onLogout={logout} />
      <div className="flex-1 min-h-screen" style={{ marginLeft: 52 }}>
        {children}
      </div>
    </div>
  );
}
