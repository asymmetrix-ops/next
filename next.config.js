/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "www.asymmetrix.info",
      "asymmetrix.info",
      "www.asymmetrixintelligence.com",
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Webpack configuration for Puppeteer/Chromium
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark these as external to avoid bundling issues
      config.externals = [
        ...config.externals,
        "@sparticuz/chromium",
        "puppeteer-core",
        "puppeteer",
      ];
    }
    return config;
  },
  // Performance optimizations
  // Compression
  compress: true,
  // Power by header
  poweredByHeader: false,
  async headers() {
    return [
      {
        // All non-asset routes: no-store to avoid stale HTML/data
        source: "/((?!_next/(?:static|image)|images|icons).*)",
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
          // Do NOT cache HTML/data responses to avoid stale content after deploys
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        // Explicitly ensure Next data JSON is never cached
        source: "/_next/data/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      // Specific headers for static assets
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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
