import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function fetchInvestorMeta(
  id: string
): Promise<{ name?: string; description?: string; logo?: string } | null> {
  try {
    const token = cookies().get("asymmetrix_auth_token")?.value;
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/get_the_investor_new_company?new_comp_id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const investor = data?.Investor;
    return {
      name: investor?.name as string | undefined,
      description: investor?.description as string | undefined,
      logo: investor?._linkedin_data_of_new_company?.linkedin_logo as
        | string
        | undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");
  const meta = await fetchInvestorMeta(id);

  const name = meta?.name;
  const title = name ? `Asymmetrix – ${name}` : "Investor | Asymmetrix";
  const description =
    meta?.description ||
    (name
      ? `${name} investor profile on Asymmetrix.`
      : "Investor profile on Asymmetrix.");

  const imageUrl = meta?.logo
    ? `data:image/jpeg;base64,${meta.logo}`
    : `${base.origin}/og-image.jpg`;
  const url = new URL(`/investors/${id}`, base).toString();

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
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function InvestorLayout({ children }: LayoutProps) {
  return children;
}
