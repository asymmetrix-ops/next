import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ASX_SESSION_COOKIE,
  ASX_STATUS_COOKIE,
  isProspectStatus,
} from "@/lib/prospect";
import ProspectConversionCard from "@/components/ProspectConversionCard";

export const metadata: Metadata = {
  title: "Book a Demo – Asymmetrix",
  description:
    "Book a slot with the Asymmetrix Sales Team to access Data & Analytics sector intelligence.",
  robots: { index: false, follow: false },
};

async function getProspectEmail(): Promise<string | null> {
  const cookieStore = cookies();
  const session = cookieStore.get(ASX_SESSION_COOKIE)?.value;
  const status = cookieStore.get(ASX_STATUS_COOKIE)?.value ?? "";

  if (!session || !isProspectStatus(status)) return null;

  const apiUrl =
    process.env.NEXT_PUBLIC_XANO_API_URL ||
    "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

  try {
    let resp = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${session}` },
      cache: "no-store",
    });
    if (resp.status === 401) {
      resp = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: session },
        cache: "no-store",
      });
    }
    if (!resp.ok) return null;
    const user = (await resp.json()) as Record<string, unknown>;
    return String(user.email ?? user.Email ?? "") || null;
  } catch {
    return null;
  }
}

export default async function GetAccessPage() {
  const email = await getProspectEmail();

  return (
    <div className="min-h-screen bg-[#F9FAFC] flex items-center justify-center p-4 sm:p-6">
      <ProspectConversionCard email={email} overlay={false} />
    </div>
  );
}
