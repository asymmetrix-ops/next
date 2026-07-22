import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isContributorSession, isMcpGuestSession } from "@/lib/mcpGuest";
import {
  isValidHttpUrl,
  MCP_GUEST_AUTH_ME_API,
  USERS_DATA_RESEARCH_REQUESTS_URL,
} from "@/lib/mcpGuestFlagServer";
import { normalizeCompanyUrl } from "@/lib/mcpGuestFlag";
import { buildMcpGuestCompanyFlagPayload } from "@/lib/usersDataResearchRequests";

type FlagCompanyPayload = {
  company_name?: unknown;
  company_url?: unknown;
  proof_url?: unknown;
  proof_image_url?: unknown;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthContext(request: NextRequest) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("asymmetrix_auth_token")?.value ||
    request.headers.get("x-asym-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const response = await fetch(`${MCP_GUEST_AUTH_ME_API}/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json().catch(() => null);
  if (!user || isContributorSession(token, user) || !isMcpGuestSession(token, user)) {
    return null;
  }

  const email = readString(
    (user as { email?: unknown }).email ??
      (user as { work_email?: unknown }).work_email
  );

  let userId: number | null = null;
  const rawId = (user as { id?: unknown }).id;
  if (typeof rawId === "number" && Number.isFinite(rawId)) {
    userId = rawId;
  } else if (typeof rawId === "string") {
    const parsed = Number.parseInt(rawId, 10);
    userId = Number.isFinite(parsed) ? parsed : null;
  }

  return { token, email, userId };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as
      | FlagCompanyPayload
      | null;

    const companyName = readString(payload?.company_name);
    const companyUrl = normalizeCompanyUrl(readString(payload?.company_url));
    const proofUrl = normalizeCompanyUrl(readString(payload?.proof_url));
    const proofImageUrl = readString(payload?.proof_image_url);

    if (!companyName) {
      return NextResponse.json(
        { error: "Please enter a company name." },
        { status: 400 }
      );
    }

    if (!companyUrl || !isValidHttpUrl(companyUrl)) {
      return NextResponse.json(
        { error: "Please enter a valid company URL." },
        { status: 400 }
      );
    }

    if (!proofUrl && !proofImageUrl) {
      return NextResponse.json(
        { error: "Please provide proof as a URL or image upload." },
        { status: 400 }
      );
    }

    if (proofUrl && !isValidHttpUrl(proofUrl)) {
      return NextResponse.json(
        { error: "Please enter a valid proof URL." },
        { status: 400 }
      );
    }

    const xanoPayload = buildMcpGuestCompanyFlagPayload({
      companyName,
      companyUrl,
      proofUrl,
      proofImageUrl,
      submittedBy: auth.userId ?? 0,
      submitterEmail: auth.email,
    });

    const doPost = (authorization: string) =>
      fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify(xanoPayload),
        cache: "no-store",
      });

    let response = await doPost(`Bearer ${auth.token}`);
    if (response.status === 401) {
      response = await doPost(auth.token);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to submit flag. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to submit flag. Please try again." },
      { status: 500 }
    );
  }
}
