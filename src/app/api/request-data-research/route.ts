import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as postmark from "postmark";
import { REQUEST_DATA_RESEARCH_TYPES } from "@/lib/requestDataResearch";

export const runtime = "nodejs";

const INTAKE_EMAIL = "Asymmetrix@asymmetrixintelligence.com";
const XANO_REQUESTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:XlV_SpG5:develop/users_data_research_requests";

type RequestPayload = {
  requestType?: unknown;
  description?: unknown;
  requesterName?: unknown;
  requesterEmail?: unknown;
  sourcePage?: unknown;
};

type Requester = {
  name: string;
  email: string;
};

const isRequestType = (value: unknown): value is string =>
  typeof value === "string" &&
  REQUEST_DATA_RESEARCH_TYPES.includes(
    value as (typeof REQUEST_DATA_RESEARCH_TYPES)[number]
  );

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const resolveName = (user: Record<string, unknown>) => {
  const directName = getString(
    user.name || user.full_name || user.Full_Name || user.Name
  );
  if (directName) return directName;

  const firstName = getString(user.first_name || user.First_Name);
  const lastName = getString(user.last_name || user.Last_Name);
  return [firstName, lastName].filter(Boolean).join(" ");
};

const getAuthToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value ||
  request.headers.get("x-asym-token");

async function getAuthenticatedRequester(
  request: Request
): Promise<Requester | null> {
  const token = getAuthToken(request);

  if (!token) return null;

  const apiUrl =
    process.env.NEXT_PUBLIC_XANO_API_URL ||
    "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

  const fetchUser = (authorization: string) =>
    fetch(`${apiUrl}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    });

  let response = await fetchUser(`Bearer ${token}`);
  if (response.status === 401) response = await fetchUser(token);
  if (!response.ok) return null;

  const user = (await response.json()) as Record<string, unknown>;
  const email = getString(user.email || user.Email);
  if (!email) return null;

  return {
    name: resolveName(user) || "Unknown",
    email,
  };
}

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
    const sourcePage = getString(payload.sourcePage);

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

    const authenticatedRequester = await getAuthenticatedRequester(request);
    const requester: Requester = authenticatedRequester || {
      name: getString(payload.requesterName) || "Unknown",
      email: getString(payload.requesterEmail),
    };

    if (!requester.email) {
      return NextResponse.json(
        { error: "Unable to identify the requesting user." },
        { status: 400 }
      );
    }

    const serverToken = process.env.POSTMARK_SERVER_TOKEN;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || INTAKE_EMAIL;
    const messageStream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

    if (!serverToken) {
      return NextResponse.json(
        { error: "Postmark is not configured for request submissions." },
        { status: 500 }
      );
    }

    const client = new postmark.ServerClient(serverToken);
    const subject = `Asymmetrix request: ${requestType}`;
    const textBody = [
      "New data and research request",
      "",
      `Type: ${requestType}`,
      `Request: ${description}`,
      sourcePage ? `Source page: ${sourcePage}` : "",
      "",
      `Requester name: ${requester.name}`,
      `Requester email: ${requester.email}`,
    ]
      .filter(Boolean)
      .join("\n");

    const htmlBody = `
      <h2>New data and research request</h2>
      <p><strong>Type:</strong> ${escapeHtml(requestType)}</p>
      <p><strong>Request:</strong><br />${escapeHtml(description).replace(
        /\n/g,
        "<br />"
      )}</p>
      ${
        sourcePage
          ? `<p><strong>Source page:</strong> ${escapeHtml(sourcePage)}</p>`
          : ""
      }
      <hr />
      <p><strong>Requester name:</strong> ${escapeHtml(requester.name)}</p>
      <p><strong>Requester email:</strong> ${escapeHtml(requester.email)}</p>
    `;

    await Promise.all([
      createXanoResearchRequest(request, requestType, description),
      client.sendEmail({
        From: fromEmail,
        To: INTAKE_EMAIL,
        ReplyTo: requester.email,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
        MessageStream: messageStream,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request data and research submission failed:", error);
    return NextResponse.json(
      { error: "Unable to submit request. Please try again." },
      { status: 500 }
    );
  }
}
