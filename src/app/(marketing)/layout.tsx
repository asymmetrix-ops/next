import "./relume.css";
import "./landing-theme.css";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { LandingCalendlyPrefetch } from "./components/LandingCalendlyInline";
import { LandingHashScroll } from "./components/LandingHashScroll";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-rebrand min-w-0 overflow-x-clip">
      <LandingCalendlyPrefetch />
      <LandingHashScroll />
      {children}
      <CookieConsentBanner />
    </div>
  );
}
