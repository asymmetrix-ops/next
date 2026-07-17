import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DATA_REQUEST_TYPES,
  RESEARCH_REQUEST_TYPES,
  RequestTab,
  tabToCategory,
  isDataRequestUrlRequired,
} from "@/lib/requestDataResearch";
import { USERS_DATA_RESEARCH_REQUESTS_URL } from "@/lib/usersDataResearchRequests";

export const runtime = "nodejs";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

type RequestPayload = {
  tab?: unknown;
  requestType?: unknown;
  url?: unknown;
  description?: unknown;
  sourcePage?: unknown;
};

const isDataType = (value: string) =>
  (DATA_REQUEST_TYPES as readonly string[]).includes(value);

const isResearchType = (value: string) =>
  (RESEARCH_REQUEST_TYPES as readonly string[]).includes(value);

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const getAuthToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value ||
  request.headers.get("x-asym-token");

async function fetchWithAuth(url: string, token: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  let response = await fetch(url, {
    ...init,
    headers: { ...headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) {
    response = await fetch(url, {
      ...init,
      headers: { ...headers, Authorization: token },
      cache: "no-store",
    });
  }

  return response;
}

async function getSubmittedByUserId(request: Request): Promise<number | null> {
  const token = getAuthToken(request);
  if (!token) return null;

  const response = await fetchWithAuth(`${AUTH_API_URL}/auth/me`, token, {
    method: "GET",
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (!data || typeof data !== "object") return null;

  if (typeof data.id === "number" && Number.isFinite(data.id)) return data.id;
  if (typeof data.id === "string") {
    const parsed = Number.parseInt(data.id, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildRequestDetails(description: string, url: string, sourcePage: string) {
  const parts: string[] = [];

  if (url) parts.push(`Reference URL: ${url}`);
  if (sourcePage) parts.push(`Source page: ${sourcePage}`);
  if (parts.length > 0) parts.push("");
  parts.push(description);

  return parts.join("\n");
}

async function postToXano(
  request: Request,
  payload: {
    type: string;
    request_details: string;
    submitted_by: number;
    category: "Data" | "Analysis";
  }
) {
  const token = getAuthToken(request);
  const body = JSON.stringify(payload);

  const doPost = (authorization?: string) =>
    fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
      cache: "no-store",
    });

  let response = await doPost(token ? `Bearer ${token}` : undefined);
  if (response.status === 401 && token) response = await doPost(token);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Xano submission failed with status ${response.status}: ${text}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RequestPayload;

    const tab = getString(payload.tab) as RequestTab | "";
    const requestType = getString(payload.requestType);
    const url = getString(payload.url);
    const description = getString(payload.description);
    const sourcePage = getString(payload.sourcePage);

    if (tab !== "data" && tab !== "research") {
      return NextResponse.json(
        { error: "Please select a valid request category." },
        { status: 400 }
      );
    }

    const category = tabToCategory(tab);

    if (category === "Data" && !isDataType(requestType)) {
      return NextResponse.json(
        { error: "Please select a valid data request type." },
        { status: 400 }
      );
    }

    if (category === "Analysis" && !isResearchType(requestType)) {
      return NextResponse.json(
        { error: "Please select a valid analysis request type." },
        { status: 400 }
      );
    }

    if (
      category === "Data" &&
      isDataRequestUrlRequired(requestType) &&
      !url
    ) {
      return NextResponse.json(
        { error: "Please provide a URL." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Please provide request details." },
        { status: 400 }
      );
    }

    const submittedBy = await getSubmittedByUserId(request);
    if (submittedBy == null) {
      return NextResponse.json(
        { error: "Unable to identify the submitting user." },
        { status: 401 }
      );
    }

    await postToXano(request, {
      type: requestType,
      request_details: buildRequestDetails(description, url, sourcePage),
      submitted_by: submittedBy,
      category,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request data and research submission failed:", error);
    return NextResponse.json(
      { error: "Unable to submit request. Please try again." },
      { status: 500 }
    );
  }
}
