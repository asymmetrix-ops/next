import type { Metadata } from "next";

const SITE_URL = "https://www.asymmetrixintelligence.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/landing-test-version1/images/hero-mockup.webp`;

/**
 * Shared metadata for the /landing-test-version1 test section.
 * Kept noindex,follow while this path is a temporary A/B variant —
 * flip `robots` here once the page is promoted to its permanent URL.
 */
export function buildLandingMetadata({
  path,
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
}: {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
}): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
