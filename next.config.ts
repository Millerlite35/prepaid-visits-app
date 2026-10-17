import type { NextConfig } from "next";

// Browser security rules sent with every page:
// - no other site may show our pages inside a frame (stops click-jacking)
// - forms may only post to us or Stripe; no plugins; no <base> tricks
// - full page addresses (pass links, private ?key= links) never leak to other sites
// - camera only for our own pages (scanner); microphone and location off
// - in production, browsers must always use https
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://*.stripe.com",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // no Next.js badge in the corner during development (it shows up in demo recordings)
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // logo uploads are up to 1 MB; leave room for the rest of the form
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
