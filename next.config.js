/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["www.asymmetrix.info", "asymmetrix.info"],
    formats: ["image/webp", "image/avif"],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/test",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
