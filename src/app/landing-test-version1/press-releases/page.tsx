import { Cta15 } from "../components/Cta15";
import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { PressReleasesHero } from "../components/PressReleasesHero";
import { PressReleasesList } from "../components/PressReleasesList";

export const metadata = {
  title: "Press Releases | Asymmetrix",
  description:
    "Official Asymmetrix press releases — coming soon.",
};

export default function PressReleasesPage() {
  return (
    <div>
      <Navbar1 />
      <PressReleasesHero
        title="Press Releases"
        description="Official announcements from Asymmetrix Intelligence."
      />
      <PressReleasesList />
      <Cta15 />
      <Footer1 />
    </div>
  );
}
