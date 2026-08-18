import { Cta15 } from "../components/Cta15";
import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { PressReleasesHero } from "../components/PressReleasesHero";
import { PressReleasesList } from "../components/PressReleasesList";
import { PRESS_RELEASES } from "@/lib/pressReleases";

export const metadata = {
  title: "Press Releases | Asymmetrix",
  description:
    "Official Asymmetrix press releases covering funding, product updates, and company milestones in Data & Analytics market intelligence.",
};

export default function PressReleasesPage() {
  const releases = [...PRESS_RELEASES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div>
      <Navbar1 />
      <PressReleasesHero
        title="Press Releases"
        description="Official announcements from Asymmetrix Intelligence on funding, product launches, and company milestones."
      />
      <PressReleasesList releases={releases} />
      <Cta15 />
      <Footer1 />
    </div>
  );
}
