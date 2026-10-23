import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { TermsAndConditionsContent } from "../components/TermsAndConditionsContent";
import { buildLandingMetadata } from "../seo";

export const metadata = buildLandingMetadata({
  path: "/terms-and-conditions",
  title: "Terms & Conditions | Asymmetrix",
  description:
    "Booking terms and conditions for Asymmetrix Summit London 2026.",
});

export default function TermsAndConditionsPage() {
  return (
    <div>
      <Navbar1 />
      <main>
        <TermsAndConditionsContent />
      </main>
      <Footer1 />
    </div>
  );
}
