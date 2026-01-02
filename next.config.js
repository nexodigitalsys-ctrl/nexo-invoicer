/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit"],

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // pode ser "2mb", "5mb", etc.
    },
  },
};

module.exports = nextConfig;
