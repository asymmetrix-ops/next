import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "react-h5-audio-player/lib/styles.css";
import { DEFAULT_OG_IMAGE } from "@/lib/articleSeo";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PlatformCurrencyProvider } from "@/components/providers/PlatformCurrencyProvider";
import { PortfolioHydrator } from "@/components/providers/PortfolioHydrator";
import { Toaster } from "react-hot-toast";
import DownloadMessageListener from "@/components/DownloadMessageListener";
import TitleUpdater from "@/components/TitleUpdater";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import ContributorRouteGuard from "@/components/ContributorRouteGuard";
import TrialRouteGuard from "@/components/TrialRouteGuard";
import AuthRouteGuard from "@/components/AuthRouteGuard";
import AuthLoginModal from "@/components/AuthLoginModal";
import PageRemountOnLogin from "@/components/PageRemountOnLogin";
import RouteTracker from "@/components/RouteTracker";
import ErrorTracker from "@/components/ErrorTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asymmetrix - Data & Analytics Demystified",
  description:
    "Providing critical intelligence to stakeholders in the Data & Analytics industry",
  keywords: [
    "data",
    "analytics",
    "intelligence",
    "market research",
    "business intelligence",
  ],
  authors: [{ name: "Asymmetrix" }],
  creator: "Asymmetrix",
  publisher: "Asymmetrix",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.asymmetrixintelligence.com"),
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Asymmetrix - Data & Analytics Demystified",
    description:
      "Providing critical intelligence to stakeholders in the Data & Analytics industry",
    url: "https://www.asymmetrixintelligence.com",
    siteName: "Asymmetrix",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Asymmetrix - Data & Analytics Demystified",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asymmetrix - Data & Analytics Demystified",
    description:
      "Providing critical intelligence to stakeholders in the Data & Analytics industry",
    images: [DEFAULT_OG_IMAGE],
  },
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
  verification: {
    google: "your-google-verification-code",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: {
      url: "/icons/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Hotjar Tracking Code */}
        <Script
          id="hotjar-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6390674,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1KZ4TCC4MW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1KZ4TCC4MW');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <PlatformCurrencyProvider>
            <PortfolioHydrator />
            <AnalyticsProvider>
              <ChunkErrorRecovery />
              <TitleUpdater />
              <AuthRouteGuard />
              <ContributorRouteGuard />
              <TrialRouteGuard />
              <Suspense fallback={null}>
                <RouteTracker />
              </Suspense>
              <ErrorTracker />
              <DownloadMessageListener />
              <PageRemountOnLogin>{children}</PageRemountOnLogin>
              <AuthLoginModal />
              <Toaster position="top-right" />
            </AnalyticsProvider>
          </PlatformCurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
