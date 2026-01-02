/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb", // ou "2mb", "5mb", etc.
    },
  },
};

export default nextConfig;
