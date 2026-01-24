/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
  // Allow the demo to import from the parent @agelum/backend package
  transpilePackages: ["@agelum/backend"],
};

export default nextConfig;
