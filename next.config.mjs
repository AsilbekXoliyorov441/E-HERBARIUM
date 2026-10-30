/** @type {import('next').NextConfig} */
const longCache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
  async headers() {
    return [
      { source: "/bg-hero.:ext(webp|png)", headers: longCache },
      { source: "/cards/:path*", headers: longCache },
      { source: "/data/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    ];
  },
};
export default nextConfig;
