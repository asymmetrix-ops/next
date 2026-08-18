import { notFound } from "next/navigation";
import { Cta15 } from "../../components/Cta15";
import { Footer1 } from "../../components/Footer1";
import { Navbar1 } from "../../components/Navbar1";
import { PressReleaseDetail } from "../../components/PressReleaseDetail";
import {
  PRESS_RELEASES,
  getPressRelease,
} from "@/lib/pressReleases";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return PRESS_RELEASES.map((release) => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const release = getPressRelease(slug);

  if (!release) {
    return { title: "Press Release Not Found | Asymmetrix" };
  }

  return {
    title: `${release.title} | Asymmetrix`,
    description: release.strapline,
  };
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
      <PressReleaseDetail release={release} />
      <Cta15 />
      <Footer1 />
    </div>
  );
}
