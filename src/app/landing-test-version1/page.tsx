import { Navbar1 } from "./components/Navbar1";
import { PlatformHero } from "./components/PlatformHero";
import { Logo3 } from "./components/Logo3";
import { Layout184 } from "./components/Layout184";
import { Coverage } from "./components/Coverage";
import { Testimonial1 } from "./components/Testimonial1";
import { Blog16Section } from "./components/Blog16Section";
import { Cta15 } from "./components/Cta15";
import { Footer1 } from "./components/Footer1";
import { FloatingCta } from "./components/FloatingCta";
import { fetchTopViewedLandingArticles } from "@/lib/fetchTopViewedLandingArticles";

export const metadata = {
  title: "Asymmetrix | Data & Analytics Market Intelligence",
  description:
    "Asymmetrix tracks 6,550+ Data & Analytics companies, 3,636 investors, 290 M&A advisors and 5,708 corporate events — proprietary intelligence on the deals, companies and people shaping the Data & Analytics industry.",
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Asymmetrix",
  url: "https://www.asymmetrixintelligence.com",
  logo: "https://www.asymmetrixintelligence.com/icons/logo.svg",
  description:
    "Asymmetrix is a B2B market intelligence platform for the Data & Analytics industry, covering companies, investors, M&A advisors and deal activity under a single consistent taxonomy.",
  knowsAbout: [
    "Data & Analytics M&A",
    "Private equity",
    "Venture capital",
    "Market intelligence",
    "Corporate events and deal tracking",
  ],
  sameAs: ["https://www.linkedin.com/company/asymmetrix"],
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Asymmetrix",
  url: "https://www.asymmetrixintelligence.com",
  description:
    "Intelligence on the Data & Analytics market — companies, investors, advisors and deals.",
};

export default async function LandingTestVersion1Page() {
  const topViewedArticles = await fetchTopViewedLandingArticles();

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
      />
      <Navbar1 />
      <PlatformHero topViewedArticles={topViewedArticles} />
      <Logo3 />
      <Layout184 />
      <Coverage />
      <Testimonial1 />
      <Logo3 id="clients-2" showHeading={false} />
      <Blog16Section />
      <Cta15 />
      <Footer1 />
      <FloatingCta />
    </div>
  );
}
