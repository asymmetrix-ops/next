import type { Metadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

// Static metadata - no Xano call to avoid blocking page render in production.
// The client will update the document title once sector data is loaded.
export const metadata: Metadata = {
  title: "Sector | Asymmetrix",
  description: "Sector profile and insights on Asymmetrix.",
  openGraph: {
    title: "Sector | Asymmetrix",
    description: "Sector profile and insights on Asymmetrix.",
    siteName: "Asymmetrix",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sector | Asymmetrix",
    description: "Sector profile and insights on Asymmetrix.",
  },
};

export default function SectorLayout({ children }: LayoutProps) {
  return children;
}
