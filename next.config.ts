import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/index.html",
      },
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
      {
        source: "/admin/",
        destination: "/admin/index.html",
      },
      {
        source: "/api/api.php",
        destination: "/api",
      },
      {
        source: "/admin/api/api.php",
        destination: "/api",
      },
    ];
  },
};

export default nextConfig;
