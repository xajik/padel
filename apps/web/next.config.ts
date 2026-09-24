import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@padel/engine", "@padel/design"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      // Games contain people's names: keep them out of search indexes (FR-7.1.5).
      { source: "/g/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
      { source: "/new/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
      { source: "/me/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Markdown mirrors via content negotiation (FR-7.4.2).
        {
          source: "/modes/:mode",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/md/modes/:mode",
        },
        { source: "/modes/:mode.md", destination: "/md/modes/:mode" },
        {
          source: "/schedule/:mode/:slug",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/md/schedule/:mode/:slug",
        },
        { source: "/schedule/:mode/:slug.md", destination: "/md/schedule/:mode/:slug" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
