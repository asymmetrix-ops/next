const KEY = "contributor_identity";

export type ContributorIdentity = { name: string; role: string };

/** Name and role the contributor typed once; reused across the forms on the page. */
export function readIdentity(): ContributorIdentity {
  if (typeof window === "undefined") return { name: "", role: "" };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<ContributorIdentity>;
    return { name: String(raw.name ?? ""), role: String(raw.role ?? "") };
  } catch {
    return { name: "", role: "" };
  }
}

export function saveIdentity(identity: ContributorIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* storage can be unavailable; the fields still work for this visit */
  }
}

/** How long the team says a review takes; shown on every confirmation. */
export const REVIEW_SLA_TEXT = "within 5 working days";
