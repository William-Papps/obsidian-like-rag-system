import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EternalNotes",
  description: "AI-powered knowledge management for teams. Query your documents with natural language and get grounded answers with citations.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EternalNotes"
  }
};

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Apply theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=JSON.parse(localStorage.getItem('studyos:theme'))||'purple';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
