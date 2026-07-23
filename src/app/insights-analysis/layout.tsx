import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/articleSeo";

export const metadata: Metadata = {
  title: "Insights & Analysis | Asymmetrix",
  description:
    "Explore Asymmetrix insights and analysis on the Data & Analytics sector, including investment ideas, market trends, and company intelligence.",
  alternates: {
    canonical: new URL("/insights-analysis", SITE_URL).toString(),
  },
  openGraph: {
    title: "Insights & Analysis | Asymmetrix",
    description:
      "Explore Asymmetrix insights and analysis on the Data & Analytics sector, including investment ideas, market trends, and company intelligence.",
    url: new URL("/insights-analysis", SITE_URL).toString(),
    siteName: "Asymmetrix",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Asymmetrix Insights & Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Insights & Analysis | Asymmetrix",
    description:
      "Explore Asymmetrix insights and analysis on the Data & Analytics sector.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function InsightsAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
