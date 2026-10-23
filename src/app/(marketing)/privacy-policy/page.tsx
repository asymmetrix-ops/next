import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { PrivacyPolicyContent } from "../components/PrivacyPolicyContent";
import { buildLandingMetadata } from "../seo";

export const metadata = buildLandingMetadata({
  path: "/privacy-policy",
  title: "Privacy Policy | Asymmetrix",
  description:
    "How Asymmetrix collects, uses and protects your information when you visit our website.",
});

export default function PrivacyPolicyPage() {
  return (
    <div>
      <Navbar1 />
      <main>
        <PrivacyPolicyContent />
      </main>
      <Footer1 />
    </div>
  );
}
