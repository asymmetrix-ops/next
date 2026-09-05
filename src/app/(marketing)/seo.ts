import type { Metadata } from "next";

const SITE_URL = "https://www.asymmetrixintelligence.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/asymmetrix-video-thumbnail.png`;

/**
 * Shared metadata for the marketing site (home, about, contact, press
 * releases, privacy policy). Promoted from the /landing-test-version1
 * A/B variant to the permanent top-level routes — indexable.
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
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      images: [{ url: ogImage, width: 1024, height: 576, alt: title }],
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
