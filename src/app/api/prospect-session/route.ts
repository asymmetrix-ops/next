import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ASX_SESSION_COOKIE,
  ASX_STATUS_COOKIE,
  isProspectStatus,
} from "@/lib/prospect";

const XANO_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

export async function GET() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(ASX_SESSION_COOKIE)?.value;
    const status = cookieStore.get(ASX_STATUS_COOKIE)?.value ?? "";

    if (!session) {
      return NextResponse.json({ isProspect: false, hasSession: false });
    }

    const isProspect = isProspectStatus(status);
    let email = "";

    if (isProspect) {
      let resp = await fetch(`${XANO_API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session}`,
        },
        cache: "no-store",
      });

      if (resp.status === 401) {
        resp = await fetch(`${XANO_API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: session,
          },
          cache: "no-store",
        });
      }

      if (resp.ok) {
        const user = (await resp.json()) as Record<string, unknown>;
        email = String(user.email ?? user.Email ?? "");
      }
    }

    return NextResponse.json({
      isProspect,
      hasSession: true,
      status,
      email: email || null,
    });
  } catch (e) {
    return NextResponse.json(
      { isProspect: false, hasSession: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
