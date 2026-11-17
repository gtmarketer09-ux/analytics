import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok-free.app', 'stammer-purse-kinship.ngrok-free.dev'],
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ['typeorm', 'mysql2'],
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
