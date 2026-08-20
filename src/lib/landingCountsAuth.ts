import { cookies } from "next/headers";
import { extractAuthToken } from "@/lib/mcpGuestAuthServer";

const XANO_AUTH_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

let cachedServiceToken: { token: string; expiresAt: number } | null = null;

async function loginWithCredentials(
  email: string,
  password: string
): Promise<string | null> {
  try {
    const response = await fetch(`${XANO_AUTH_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `landing counts service login failed for ${email}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    return extractAuthToken(data) || null;
  } catch (error) {
    console.error("landing counts service login error:", error);
    return null;
  }
}

export async function getServiceAuthToken(): Promise<string | null> {
  const staticToken =
    process.env.ASYMMETRIX_LANDING_TOKEN?.trim() ||
    process.env.ASYMMETRIX_TOKEN?.trim();
  if (staticToken) return staticToken;

  if (cachedServiceToken && Date.now() < cachedServiceToken.expiresAt) {
    return cachedServiceToken.token;
  }

  const credentialPairs: Array<[string | undefined, string | undefined]> = [
    [process.env.CRON_AUTH_EMAIL, process.env.CRON_AUTH_PASSWORD],
    [
      process.env.CONTRIBUTOR_SERVICE_EMAIL,
      process.env.CONTRIBUTOR_SERVICE_PASSWORD,
    ],
  ];

  for (const [email, password] of credentialPairs) {
    if (!email?.trim() || !password?.trim()) continue;
    const token = await loginWithCredentials(email, password);
    if (!token) continue;

    cachedServiceToken = {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return token;
  }

  return null;
}

export async function resolveLandingCountsAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("asymmetrix_auth_token")?.value?.trim();
  if (cookieToken) return cookieToken;
  return getServiceAuthToken();
}
