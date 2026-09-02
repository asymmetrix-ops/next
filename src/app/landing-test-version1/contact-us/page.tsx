import { ContactFormSection } from "../components/ContactFormSection";
import { ContactHero } from "../components/ContactHero";
import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { buildLandingMetadata } from "../seo";

export const metadata = buildLandingMetadata({
  path: "/landing-test-version1/contact-us",
  title: "Contact Us | Asymmetrix",
  description:
    "Get in touch with the Asymmetrix team — questions on coverage, data, partnerships or a demo of the platform.",
});

export default function ContactUsPage() {
  return (
    <div>
      <Navbar1 />
      <main>
        <ContactHero
          eyebrow="Get in touch"
          title="Send a message"
          description="Whether you're evaluating the platform, have a data question, or want to talk partnerships — tell us what you need and we'll get back to you."
        />
        <ContactFormSection />
      </main>
      <Footer1 />
    </div>
  );
}
