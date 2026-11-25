import { Cta15 } from "../components/Cta15";
import { Footer1 } from "../components/Footer1";
import { Navbar1 } from "../components/Navbar1";
import { PressReleasesHero } from "../components/PressReleasesHero";
import { PressReleasesList } from "../components/PressReleasesList";
import { PressMentionsList } from "../components/PressMentionsList";
import { PRESS_MENTIONS } from "@/lib/pressMentions";
import { PRESS_RELEASES } from "@/lib/pressReleases";
import { SITE_URL } from "@/lib/articleSeo";
import { buildLandingMetadata } from "../seo";

export const metadata = buildLandingMetadata({
  path: "/press-releases",
  title: "Press | Asymmetrix",
  description:
    "Asymmetrix press releases, company announcements and press mentions: where Asymmetrix and our research are featured in the press and on other websites.",
});

const PRESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Asymmetrix Press",
  url: `${SITE_URL}/press-releases`,
  isPartOf: { "@type": "WebSite", name: "Asymmetrix", url: SITE_URL },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      ...PRESS_RELEASES.map((r) => ({
        "@type": "NewsArticle",
        headline: r.title,
        datePublished: r.date,
        url: `${SITE_URL}/press-releases/${r.slug}`,
      })),
      ...PRESS_MENTIONS.map((m) => ({
        "@type": "Article",
        headline: m.title,
        url: m.url,
        ...(m.date ? { datePublished: m.date } : {}),
        publisher: { "@type": "Organization", name: m.source },
        about: { "@type": "Organization", name: "Asymmetrix" },
      })),
    ].map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
  },
};

export default function PressReleasesPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRESS_JSON_LD) }}
      />
      <Navbar1 />
      <main>
        <PressReleasesHero
          title="Press"
          description="Announcements from Asymmetrix Intelligence and coverage of Asymmetrix in the press."
        />
        <PressReleasesList />
        <PressMentionsList />
        <Cta15 />
      </main>
      <Footer1 />
    </div>
  );
}
