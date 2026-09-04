import "./relume.css";
import "./landing-theme.css";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { LandingCalendlyPrefetch } from "./components/LandingCalendlyInline";
import { LandingHashScroll } from "./components/LandingHashScroll";

export default function LandingTestVersion1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-rebrand">
      <LandingCalendlyPrefetch />
      <LandingHashScroll />
      {children}
      <CookieConsentBanner />
    </div>
  );
}
