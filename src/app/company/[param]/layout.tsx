import type { Metadata, ResolvingMetadata } from "next";
import { readEntityLogo } from "@/lib/companyLogo";

type LayoutProps = {
  children: React.ReactNode;
  params: { param: string };
};

async function fetchCompanyMeta(
  id: string
): Promise<{ name?: string; description?: string; logo?: string } | null> {
  try {
    const res = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${id}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const company = data?.Company;
    return {
      name: company?.name as string | undefined,
      description: (company?.description as string | undefined) ?? undefined,
      logo: readEntityLogo(company) ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { param: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.param;
  const fallbackTitle = "Company | Asymmetrix";
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");

  const meta = await fetchCompanyMeta(id);
  const title = meta?.name ? `Asymmetrix – ${meta.name}` : fallbackTitle;
  const description = meta?.description || "Company profile on Asymmetrix.";

  const imageUrl = meta?.logo ?? `${base.origin}/og-image.jpg`;

  const url = new URL(`/company/${id}`, base).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      images: [{ url: imageUrl }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function CompanyLayout({ children }: LayoutProps) {
  return children;
}
