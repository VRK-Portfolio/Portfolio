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
  allowedDevOrigins: ['192.168.1.79']
};

export default nextConfig;
