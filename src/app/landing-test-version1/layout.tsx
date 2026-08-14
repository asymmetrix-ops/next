import "./relume.css";
import "./landing-theme.css";
import { LandingCalendlyPrefetch } from "./components/LandingCalendlyInline";

export default function LandingTestVersion1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-rebrand">
      <LandingCalendlyPrefetch />
      {children}
    </div>
  );
}
