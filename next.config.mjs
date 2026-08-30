/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits .next/standalone with a self-contained server.js — keeps the
  // Cloud Run container small and avoids shipping node_modules.
  output: "standalone",
};

export default nextConfig;
