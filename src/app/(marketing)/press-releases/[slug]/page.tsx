import { notFound } from "next/navigation";
import { getPressRelease } from "@/lib/pressReleases";
import { Cta15 } from "../../components/Cta15";
import { Footer1 } from "../../components/Footer1";
import { Navbar1 } from "../../components/Navbar1";
import { PressReleaseDetail } from "../../components/PressReleaseDetail";
import { buildLandingMetadata } from "../../seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const release = getPressRelease(slug);

  if (!release) {
    return buildLandingMetadata({
      path: "/press-releases",
      title: "Press Release | Asymmetrix",
      description: "Official Asymmetrix press releases.",
    });
  }

  return buildLandingMetadata({
    path: `/press-releases/${slug}`,
    title: `${release.title} | Asymmetrix`,
    description: release.strapline,
  });
}

export default async function PressReleasePage({ params }: PageProps) {
  const { slug } = await params;
  const release = getPressRelease(slug);

  if (!release) {
    notFound();
  }

  return (
    <div>
      <Navbar1 />
      <main>
        <PressReleaseDetail release={release} />
        <Cta15 />
      </main>
      <Footer1 />
    </div>
  );
}
