import { NextResponse } from "next/server";
import { LANDING_CONTACT_EMAIL } from "@/lib/landingContact";

type ContactPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  about?: unknown;
  message?: unknown;
};

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const ABOUT_LABELS: Record<string, string> = {
  "pe-firm": "PE firm",
  "ma-advisor": "M&A advisor",
  corporate: "Corporate",
  investor: "Investor",
  journalist: "Journalist",
  other: "Other",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContactPayload;

    const firstName = getString(payload.firstName);
    const lastName = getString(payload.lastName);
    const email = getString(payload.email);
    const phone = getString(payload.phone);
    const about = getString(payload.about);
    const message = getString(payload.message);
    const aboutLabel = ABOUT_LABELS[about] ?? (about || "Inquiry");

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      );
    }

    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    if (!postmarkToken) {
      console.error(
        "Landing contact submission failed: POSTMARK_SERVER_TOKEN is not set."
      );
      return NextResponse.json(
        { error: "Unable to send your message. Please try again." },
        { status: 500 }
      );
    }

    const fullName = `${firstName} ${lastName}`;
    const rows: Array<[string, string]> = [
      ["Name", fullName],
      ["Email", email],
      ["Phone", phone || "—"],
      ["Type", aboutLabel],
    ];

    const htmlBody = `
      <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:sans-serif;font-size:14px;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:6px 12px;font-weight:600;color:#000B29;vertical-align:top;white-space:nowrap;">${escapeHtml(
              label
            )}</td>
            <td style="padding:6px 12px;color:#000B29;">${escapeHtml(value)}</td>
          </tr>`
          )
          .join("")}
        <tr>
          <td style="padding:6px 12px;font-weight:600;color:#000B29;vertical-align:top;">Message</td>
          <td style="padding:6px 12px;color:#000B29;white-space:pre-wrap;">${escapeHtml(
            message
          )}</td>
        </tr>
      </table>
    `;

    const textBody = [
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      "Message:",
      message,
    ].join("\n");

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
      body: JSON.stringify({
        From: LANDING_CONTACT_EMAIL,
        To: LANDING_CONTACT_EMAIL,
        ReplyTo: email,
        Subject: `Asymmetrix contact: ${aboutLabel} — ${fullName}`,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: "outbound",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        "Landing contact submission failed: Postmark error",
        response.status,
        errorBody
      );
      return NextResponse.json(
        { error: "Unable to send your message. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Landing contact submission failed:", error);
    return NextResponse.json(
      { error: "Unable to send your message. Please try again." },
      { status: 500 }
    );
  }
}
