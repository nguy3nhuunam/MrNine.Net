import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "26.18.20.106",
  ],
  async rewrites() {
    return [
      {
        source: "/voice-studio-runtime/:path*",
        destination: "http://127.0.0.1:7861/:path*",
      },
      {
        source: "/inkos-studio/:path*",
        destination: "http://127.0.0.1:4567/:path*",
      },
      {
        source: "/assets/:path*",
        destination: "http://127.0.0.1:4567/assets/:path*",
      },
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:4567/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
