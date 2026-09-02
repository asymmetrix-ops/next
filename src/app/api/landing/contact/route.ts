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

    const response = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(LANDING_CONTACT_EMAIL)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `Asymmetrix contact: ${aboutLabel}`,
          _captcha: "false",
          _template: "table",
          name: `${firstName} ${lastName}`,
          email,
          phone: phone || "—",
          type: aboutLabel,
          message,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
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
