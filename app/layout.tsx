import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: "400"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"]
});

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
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${mono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Apply theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=JSON.parse(localStorage.getItem('studyos:theme'))||'purple';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
