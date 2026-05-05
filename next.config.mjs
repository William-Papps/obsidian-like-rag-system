/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["notes.eternalbot.net"],
  // Prevent pdf-parse and mammoth from being bundled — they rely on
  // Node.js file system access at init time and must run as native modules.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" }
        ]
      }
    ];
  }
};

export default nextConfig;
