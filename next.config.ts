import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/sign-in",
        has: [{ type: "host", value: "www.hexofearth.com" }],
        destination: "https://hexofearth.com/sign-in",
        permanent: true
      },
      {
        source: "/sign-in",
        has: [{ type: "host", value: "(?<host>.*\\.vercel\\.app)" }],
        destination: "https://hexofearth.com/sign-in",
        permanent: true
      }
    ];
  },
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE ?? "false"
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" }
    ]
  }
};

export default nextConfig;
