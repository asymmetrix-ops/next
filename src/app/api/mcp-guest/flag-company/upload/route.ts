import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isContributorSession, isMcpGuestSession } from "@/lib/mcpGuest";
import {
  MCP_GUEST_AUTH_ME_API,
  MCP_GUEST_FLAG_IMAGE_API,
} from "@/lib/mcpGuestFlagServer";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function getMcpGuestToken(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("asymmetrix_auth_token")?.value ||
    request.headers.get("x-asym-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const response = await fetch(`${MCP_GUEST_AUTH_ME_API}/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const user = await response.json().catch(() => null);
  if (!user || isContributorSession(token, user) || !isMcpGuestSession(token, user)) {
    return null;
  }

  return token;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getMcpGuestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please upload an image file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 8 MB or smaller." },
        { status: 400 }
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("img", file, file.name);

    const response = await fetch(MCP_GUEST_FLAG_IMAGE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadForm,
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as {
      image?: { url?: string };
      url?: string;
    } | null;

    const imageUrl =
      (typeof data?.image?.url === "string" && data.image.url) ||
      (typeof data?.url === "string" && data.url) ||
      "";

    if (!response.ok || !imageUrl) {
      return NextResponse.json(
        { error: "Unable to upload image. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch {
    return NextResponse.json(
      { error: "Unable to upload image. Please try again." },
      { status: 500 }
    );
  }
}
