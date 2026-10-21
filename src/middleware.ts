import { NextRequest, NextResponse } from "next/server";
import {
  CONTRIBUTOR_COMPANY_HEADER,
  CONTRIBUTOR_SESSION_COOKIE,
  verifyContributorToken,
} from "@/lib/contributorCrm/linkToken";

/**
 * Contributor links carry a signed token (`?t=`) bound to one company. The
 * token is moved into an httpOnly cookie, and from then on the visitor can only
 * open that company's page and call contributor APIs for it, so editing the
 * id in the URL does not give access to another company.
 *
 * Enforcement turns on once CONTRIBUTOR_LINK_SECRET is set (same value as in the CMS).
 */
const COMPANY_PAGE = /^\/contributor-crm\/(\d+)\/?$/;
const ACCESS_ERROR = "/contributor-crm/link-expired";

export async function middleware(request: NextRequest) {
  const secret = process.env.CONTRIBUTOR_LINK_SECRET;
  if (!secret) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  const session = await verifyContributorToken(
    request.cookies.get(CONTRIBUTOR_SESSION_COOKIE)?.value,
    secret
  );

  // APIs: calls coming from a company page need that company's session.
  // (Staff tools under /admin and team pages keep their own access.)
  if (pathname.startsWith("/contributor-crm/api/")) {
    const headers = new Headers(request.headers);
    headers.delete(CONTRIBUTOR_COMPANY_HEADER);
    const referer = request.headers.get("referer") ?? "";
    const fromCompanyPage = /\/contributor-crm\/\d+/.test(referer);
    if (session) headers.set(CONTRIBUTOR_COMPANY_HEADER, String(session.companyId));
    else if (fromCompanyPage) {
      return NextResponse.json(
        { error: "This link has expired. Please use the link in your email." },
        { status: 403 }
      );
    }
    return NextResponse.next({ request: { headers } });
  }

  const match = pathname.match(COMPANY_PAGE);
  if (!match) return NextResponse.next();
  const pageCompanyId = Number(match[1]);

  const linkToken = searchParams.get("t");
  if (linkToken) {
    const fromLink = await verifyContributorToken(linkToken, secret);
    if (!fromLink || fromLink.companyId !== pageCompanyId) {
      return NextResponse.redirect(new URL(ACCESS_ERROR, request.url));
    }
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("t");
    const response = NextResponse.redirect(clean);
    response.cookies.set(CONTRIBUTOR_SESSION_COOKIE, linkToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/contributor-crm",
      expires: new Date(fromLink.expiresAt * 1000),
    });
    return response;
  }

  if (!session) return NextResponse.redirect(new URL(ACCESS_ERROR, request.url));

  // Blocked from navigating to another company: send them back to their own.
  if (session.companyId !== pageCompanyId) {
    const own = request.nextUrl.clone();
    own.pathname = `/contributor-crm/${session.companyId}`;
    return NextResponse.redirect(own);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/contributor-crm/:path*"],
};
