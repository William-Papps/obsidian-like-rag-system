import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <div className="text-7xl font-bold tracking-tight text-accent-500/30">404</div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-100">Page not found</h1>
      <p className="mt-2 text-sm text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-9 items-center gap-2 rounded-lg border border-accent-500/40 bg-accent-500/10 px-5 text-sm font-medium text-accent-300 transition-colors hover:bg-accent-500/20"
      >
        Back to workspace
      </Link>
    </main>
  );
}
