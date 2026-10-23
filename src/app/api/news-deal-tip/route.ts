import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USERS_DATA_RESEARCH_REQUESTS_URL } from "@/lib/usersDataResearchRequests";
import { LANDING_CONTACT_EMAIL } from "@/lib/landingContact";

export const runtime = "nodejs";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

const DEAL_TIP_TYPE = "Deal Tip";

// Tips are emailed to both the Asymmetrix inbox and Jordan. Overridable per environment
// with a comma-separated list.
const DEAL_TIP_RECIPIENTS = (
  process.env.DEAL_TIP_RECIPIENTS ||
  "asymmetrix@asymmetrixintelligence.com,j.bintcliffe@asymmetrixintelligence.com"
)
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const POSTMARK_URL = process.env.POSTMARK_API_URL || "https://api.postmarkapp.com/email";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const getToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value || request.headers.get("x-asym-token");

type SubmittingUser = { id: number; name: string; email: string };

async function getUser(token: string): Promise<SubmittingUser | null> {
  for (const authorization of [`Bearer ${token}`, token]) {
    const res = await fetch(`${AUTH_API_URL}/auth/me`, {
      headers: { "Content-Type": "application/json", Authorization: authorization },
      cache: "no-store",
    });
    if (res.status === 401) continue;
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { id?: unknown; name?: unknown; email?: unknown }
      | null;
    const id = Number(data?.id);
    if (!Number.isFinite(id)) return null;
    return {
      id,
      name: typeof data?.name === "string" ? data.name.trim() : "",
      email: typeof data?.email === "string" ? data.email.trim() : "",
    };
  }
  return null;
}

/** Best effort: the tip is already logged, so a failed email must not fail the request. */
async function emailTipToJordan(tip: {
  user: SubmittingUser;
  tip: string;
  companyName: string;
  canContact: boolean;
}) {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  if (!postmarkToken) {
    console.error("Deal tip email skipped: POSTMARK_SERVER_TOKEN is not set.");
    return;
  }

  const who = tip.user.name || tip.user.email || `User #${tip.user.id}`;
  const rows: Array<[string, string]> = [
    ["From", [tip.user.name, tip.user.email].filter(Boolean).join(" · ") || `User #${tip.user.id}`],
    ["Company", tip.companyName || "—"],
    ["Can we contact them?", tip.canContact ? "Yes" : "No"],
  ];
  const htmlBody = `
    <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:sans-serif;font-size:14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 12px;font-weight:600;color:#000B29;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:6px 12px;color:#000B29;">${escapeHtml(value)}</td>
        </tr>`
        )
        .join("")}
      <tr>
        <td style="padding:6px 12px;font-weight:600;color:#000B29;vertical-align:top;">Tip</td>
        <td style="padding:6px 12px;color:#000B29;white-space:pre-wrap;">${escapeHtml(tip.tip)}</td>
      </tr>
    </table>`;
  const textBody = [...rows.map(([l, v]) => `${l}: ${v}`), "", "Tip:", tip.tip].join("\n");

  try {
    const response = await fetch(POSTMARK_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
      body: JSON.stringify({
        From: LANDING_CONTACT_EMAIL,
        To: DEAL_TIP_RECIPIENTS.join(","),
        // Only invite a reply when the submitter said we may contact them.
        ...(tip.canContact && tip.user.email ? { ReplyTo: tip.user.email } : {}),
        Subject: `Deal tip${tip.companyName ? `: ${tip.companyName}` : ""} — ${who}`,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: "outbound",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => null);
    // Postmark can answer 200 with a non-zero ErrorCode: nothing was queued.
    if (!response.ok || !result || result.ErrorCode !== 0) {
      console.error("Deal tip email failed:", response.status, JSON.stringify(result));
    }
  } catch (error) {
    console.error("Deal tip email failed:", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tip = str(body.tip);
    if (!tip) {
      return NextResponse.json({ error: "Please enter your tip." }, { status: 400 });
    }

    const token = getToken(request);
    const user = token ? await getUser(token) : null;
    if (!token || user == null) {
      return NextResponse.json({ error: "Unable to identify the submitting user." }, { status: 401 });
    }

    const companyName = str(body.companyName);
    const details = [
      ...(companyName ? [`Company: ${companyName}`] : []),
      `Can contact: ${body.canContact === false ? "No" : "Yes"}`,
      "Source page: News",
      "",
      tip,
    ].join("\n");

    const payload = JSON.stringify({
      type: DEAL_TIP_TYPE,
      category: "Data",
      request_details: details,
      submitted_by: user.id,
    });

    let res = await fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: payload,
      cache: "no-store",
    });
    if (res.status === 401) {
      res = await fetch(USERS_DATA_RESEARCH_REQUESTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: payload,
        cache: "no-store",
      });
    }
    if (!res.ok) {
      throw new Error(`Xano submission failed (${res.status}): ${await res.text().catch(() => "")}`);
    }
    await emailTipToJordan({
      user,
      tip,
      companyName,
      canContact: body.canContact !== false,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deal tip submission failed:", error);
    return NextResponse.json({ error: "Unable to submit your tip. Please try again." }, { status: 500 });
  }
}
