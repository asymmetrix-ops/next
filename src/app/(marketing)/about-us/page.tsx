import { AboutHero } from "../components/AboutHero";
import { AboutTeam } from "../components/AboutTeam";
import { AboutValues } from "../components/AboutValues";
import { Cta15 } from "../components/Cta15";
import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { buildLandingMetadata } from "../seo";

export const metadata = buildLandingMetadata({
  path: "/about-us",
  title: "About Us | Asymmetrix",
  description:
    "Asymmetrix is the source of truth for the Data & Analytics universe — meet the team and the values behind the platform.",
});

export default function AboutUsPage() {
  return (
    <div>
      <Navbar1 />
      <main>
        <AboutHero />
        <AboutValues />
        <AboutTeam />
        <Cta15 />
      </main>
      <Footer1 />
    </div>
  );
}
