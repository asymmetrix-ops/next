export const PROSPECT_STATUS = "Prospect";

export const GET_ACCESS_PATH = "/get-access";

export const ASX_SESSION_COOKIE = "asx_session";
export const ASX_STATUS_COOKIE = "asx_status";

export const CALENDLY_URL =
  "https://calendly.com/d/cvxj-zdj-nss/intro-call-with-asymmetrix";

/** 30-day cookie lifetime in seconds. */
export const PROSPECT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function isProspectStatus(value: unknown): boolean {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "prospect"
  );
}

export function buildCalendlyUrl(email?: string | null): string {
  const params = new URLSearchParams({ hide_gdpr_banner: "1" });
  if (email) params.set("email", email);
  return `${CALENDLY_URL}?${params.toString()}`;
}
