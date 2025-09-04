import { Metadata } from "next";
import MarketSection from "@/components/MarketSection";
import SolutionSection from "@/components/SolutionSection";
import ReportsSection from "@/components/ReportsSection";
import Footer from "@/components/Footer";
import HomeHeader from "@/components/HomeHeader";
import HeroSection from "@/components/HeroSection";

export const metadata: Metadata = {
  title: "Asymmetrix | Data & Analytics Intelligence Platform",
  description:
    "Asymmetrix is the source of truth for the Data & Analytics universe. Get up-to-date information and analysis of all businesses in the data analytics sector. Discover market insights, company profiles, and industry trends.",
  keywords: [
    "Asymmetrix",
    "Data Analytics",
    "Business Intelligence",
    "Market Intelligence",
    "Data Science",
    "Analytics Platform",
    "Corporate Intelligence",
    "Industry Analysis",
    "Data Insights",
  ],
  authors: [{ name: "Asymmetrix" }],
  creator: "Asymmetrix",
  publisher: "Asymmetrix",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.asymmetrixintelligence.com",
    title: "Asymmetrix | Data & Analytics Intelligence Platform",
    description:
      "The source of truth for the Data & Analytics universe. Get comprehensive market intelligence and insights for the data analytics sector.",
    siteName: "Asymmetrix",
    images: [
      {
        url: "/images/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "Asymmetrix - Data & Analytics Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asymmetrix | Data & Analytics Intelligence Platform",
    description:
      "The source of truth for the Data & Analytics universe. Get comprehensive market intelligence and insights.",
    images: ["/images/og-home.jpg"],
  },
  alternates: {
    canonical: "https://asymmetrix.com",
  },
  verification: {
    google: "your-google-verification-code", // Add your actual Google verification code
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Asymmetrix",
    url: "https://asymmetrix.com",
    logo: "https://asymmetrix.com/icons/logo.svg",
    description:
      "Asymmetrix is the source of truth for the Data & Analytics universe, providing comprehensive market intelligence and insights for the data analytics sector.",
    industry: "Data Analytics",
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: "Alex Boden",
      jobTitle: "Founder & CEO",
      sameAs: "https://www.linkedin.com/in/alexanderboden/",
    },
    sameAs: [
      "https://asymmetrixintelligence.substack.com/",
      "https://www.linkedin.com/in/alexanderboden/",
    ],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://asymmetrix.com",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://asymmetrix.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen">
        <HomeHeader />
        <HeroSection />
        <MarketSection />
        <SolutionSection />
        <ReportsSection />
        <Footer />
      </div>
    </>
  );
}
