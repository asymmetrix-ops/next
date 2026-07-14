import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ASX_SESSION_COOKIE,
  ASX_STATUS_COOKIE,
  PROSPECT_COOKIE_MAX_AGE,
} from "@/lib/prospect";

const XANO_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

async function validateRefToken(ref: string) {
  let resp = await fetch(`${XANO_API_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ref}`,
    },
    cache: "no-store",
  });

  if (resp.status === 401) {
    resp = await fetch(`${XANO_API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: ref,
      },
      cache: "no-store",
    });
  }

  if (!resp.ok) return null;
  return (await resp.json()) as Record<string, unknown>;
}

export async function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();

  try {
    const user = await validateRefToken(ref);
    if (!user) return NextResponse.next();

    const status = String(user.Status ?? user.status ?? user.role ?? "");

    const url = request.nextUrl.clone();
    url.searchParams.delete("ref");

    const response = NextResponse.redirect(url);
    const secure = process.env.NODE_ENV === "production";
    const cookieBase = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: PROSPECT_COOKIE_MAX_AGE,
    };

    response.cookies.set(ASX_SESSION_COOKIE, ref, cookieBase);
    response.cookies.set(ASX_STATUS_COOKIE, status, cookieBase);

    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
