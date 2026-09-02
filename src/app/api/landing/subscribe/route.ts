import { NextResponse } from "next/server";

const SUBSTACK_PUBLICATION_URL = "https://asymmetrixintelligence.substack.com";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: unknown };
    const email = typeof payload.email === "string" ? payload.email.trim() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const response = await fetch(`${SUBSTACK_PUBLICATION_URL}/api/v1/free?nojs=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        first_url: `${SUBSTACK_PUBLICATION_URL}/`,
        first_referrer: "",
        current_url: `${SUBSTACK_PUBLICATION_URL}/`,
        current_referrer: "",
        referral_code: "",
        source: "embed",
      }).toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to subscribe right now. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Substack subscribe proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to subscribe right now. Please try again." },
      { status: 500 }
    );
  }
}
