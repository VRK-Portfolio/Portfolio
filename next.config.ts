import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vijayrameshkumar.com',
      },
    ],
  },
};

export default nextConfig;
