import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EternalNotes",
  description: "A local Obsidian-like study workspace with grounded RAG tools."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
