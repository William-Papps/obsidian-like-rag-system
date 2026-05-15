/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["notes.eternalbot.net"],
  // Prevent pdf-parse and mammoth from being bundled — they rely on
  // Node.js file system access at init time and must run as native modules.
  serverExternalPackages: ["pdf-parse", "mammoth", "better-sqlite3"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js inlines small scripts for hydration; KaTeX and CodeMirror need eval for syntax highlighting
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      // Tailwind and component libraries use inline styles extensively
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // User-uploaded images are served from the same origin; data: URIs used by KaTeX
      "img-src 'self' data: blob:",
      // KaTeX fonts
      "font-src 'self' data:",
      // Cloudflare Turnstile iframe
      "frame-src https://challenges.cloudflare.com",
      // All API calls go through the same origin
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          // HSTS: tell browsers to always use HTTPS for the next 2 years
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp }
        ]
      }
    ];
  }
};

export default nextConfig;
