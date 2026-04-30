import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REQUEST_DATA_RESEARCH_TYPES } from "@/lib/requestDataResearch";

export const runtime = "nodejs";

const XANO_REQUESTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:XlV_SpG5:develop/users_data_research_requests";

type RequestPayload = {
  requestType?: unknown;
  description?: unknown;
};

const isRequestType = (value: unknown): value is string =>
  typeof value === "string" &&
  REQUEST_DATA_RESEARCH_TYPES.includes(
    value as (typeof REQUEST_DATA_RESEARCH_TYPES)[number]
  );

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getAuthToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value ||
  request.headers.get("x-asym-token");

async function createXanoResearchRequest(
  request: Request,
  requestType: string,
  description: string
) {
  const token = getAuthToken(request);
  const body = JSON.stringify({
    type: requestType,
    request_details: description,
  });

  const postRequest = (authorization?: string) =>
    fetch(XANO_REQUESTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
      cache: "no-store",
    });

  let response = await postRequest(token ? `Bearer ${token}` : undefined);
  if (response.status === 401 && token) response = await postRequest(token);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Xano request submission failed with status ${response.status}: ${text}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RequestPayload;
    const requestType = getString(payload.requestType);
    const description = getString(payload.description);

    if (!isRequestType(requestType)) {
      return NextResponse.json(
        { error: "Please select a request type." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Please describe the request." },
        { status: 400 }
      );
    }

    await createXanoResearchRequest(request, requestType, description);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request data and research submission failed:", error);
    return NextResponse.json(
      { error: "Unable to submit request. Please try again." },
      { status: 500 }
    );
  }
}
