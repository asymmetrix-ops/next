import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: { param: string };
};

async function fetchAdvisorMeta(
  id: string
): Promise<{ name?: string; description?: string; logo?: string } | null> {
  try {
    const token = cookies().get("asymmetrix_auth_token")?.value;
    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_the_advisor_new_company?new_comp_id=${encodeURIComponent(
      id
    )}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const advisor = data?.Advisor;
    return {
      name: advisor?.name as string | undefined,
      description: advisor?.description as string | undefined,
      logo: advisor?._linkedin_data_of_new_company?.linkedin_logo as
        | string
        | undefined,
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
  const base =
    (await parent).metadataBase ?? new URL("https://asymmetrix.info");
  const meta = await fetchAdvisorMeta(id);

  const name = meta?.name;
  const title = name ? `Asymmetrix – ${name}` : "Advisor | Asymmetrix";
  const description =
    meta?.description ||
    (name
      ? `${name} advisor profile on Asymmetrix.`
      : "Advisor profile on Asymmetrix.");

  const imageUrl = meta?.logo
    ? `data:image/jpeg;base64,${meta.logo}`
    : `${base.origin}/og-image.jpg`;
  const url = new URL(`/advisor/${id}`, base).toString();

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

export default function AdvisorLayout({ children }: LayoutProps) {
  return children;
}
