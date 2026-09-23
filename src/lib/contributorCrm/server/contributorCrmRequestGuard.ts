import { NextResponse } from "next/server";

const CONTRIBUTOR_CRM_PATH = "/contributor-crm";

/** Browser requests that originate from contributor CRM pages. */
export function isContributorCrmReferer(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const referer = request.headers.get("referer") ?? "";
  const origin = request.headers.get("origin") ?? "";
  return (
    referer.includes(CONTRIBUTOR_CRM_PATH) ||
    origin.includes(CONTRIBUTOR_CRM_PATH)
  );
}

/**
 * Blocks service-auth contributor APIs from being called outside contributor pages.
 * The cron token never reaches the browser; these routes are the only entry point.
 */
export function rejectUnlessContributorCrmPage(request: {
  headers: { get(name: string): string | null };
}): NextResponse | null {
  if (isContributorCrmReferer(request)) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "Contributor service auth is only available on contributor CRM pages.",
    },
    { status: 403 }
  );
}
