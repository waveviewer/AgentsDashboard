import type { NextConfig } from "next";

/**
 * Security headers applied to every response. The dashboard is internet-exposed,
 * so we lock down framing, MIME sniffing, referrer leakage and transport security.
 * CSP is intentionally strict; `unsafe-inline` for styles is required by Tailwind's
 * runtime style injection and Next's inlined bootstrap styles.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Security headers are applied to every response (the app is internet-exposed).
  // Run behind a TLS-terminating reverse proxy (see Caddyfile.example) with the
  // standard `next start` server — simple single-process deploy for one host.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
