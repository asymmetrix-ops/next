const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu"]);

function rootDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  return parts.slice(tld.length === 2 && SECOND_LEVEL.has(sld) ? -3 : -2).join(".");
}

function websiteOf(company: unknown): string {
  const data = company as Record<string, unknown> | null;
  const inner = (data?.Company ?? data?.company ?? data) as Record<string, unknown> | null;
  const url = inner?.url ?? inner?.website ?? data?.url;
  return typeof url === "string" ? url.trim() : "";
}

export type DomainCheck = {
  matches: boolean | null;
  email_domain: string;
  site_domain: string;
};

/**
 * Compares the submitter's email domain with the company's website domain.
 * matches=null when the company has no website to compare against; a forwarded
 * link or a personal address (e.g. gmail.com) comes out as matches=false.
 */
export function checkSubmitterDomain(email: string, company: unknown): DomainCheck {
  const emailDomain = email.includes("@") ? rootDomain(email.split("@").pop() ?? "") : "";
  const site = websiteOf(company);
  if (!site) return { matches: null, email_domain: emailDomain, site_domain: "" };
  let host = "";
  try {
    host = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname;
  } catch {
    return { matches: null, email_domain: emailDomain, site_domain: "" };
  }
  const siteDomain = rootDomain(host);
  return { matches: Boolean(emailDomain) && emailDomain === siteDomain, email_domain: emailDomain, site_domain: siteDomain };
}
