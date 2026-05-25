/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["158.69.199.238"],
  images: {
    unoptimized: true,
    domains: ["avatars.githubusercontent.com"],
  },
};

module.exports = nextConfig;
