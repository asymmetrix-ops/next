import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";

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
  metadataBase: new URL("https://asymmetrix.info"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Asymmetrix - Data & Analytics Demystified",
    description:
      "Providing critical intelligence to stakeholders in the Data & Analytics industry",
    url: "https://asymmetrix.info",
    siteName: "Asymmetrix",
    images: [
      {
        url: "https://asymmetrix.info/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Asymmetrix - Data & Analytics Demystified",
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
    images: ["https://asymmetrix.info/og-image.jpg"],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Hotjar Tracking Code - Disabled until proper ID is provided */}
        {/* <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:YOUR_HOTJAR_ID,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        /> */}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'YOUR_GA_ID');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AnalyticsProvider>
            {children}
            <Toaster position="top-right" />
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
