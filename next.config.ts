import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Docker 전용 — Vercel 배포 시 불필요
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
