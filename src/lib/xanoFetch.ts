import { isContributorCrmPath } from "@/lib/userStatus";
import { contributorFetch } from "@/lib/contributorCrm/contributorFetch";

/**
 * fetch() for Xano reads shared between the main app and the contributor pages.
 * On /contributor-crm pages there is no user token, so the call goes through the
 * contributor proxy (service auth); everywhere else it is a plain fetch.
 */
export function xanoFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (
    typeof window !== "undefined" &&
    isContributorCrmPath(window.location.pathname)
  ) {
    return contributorFetch(url, init);
  }
  return fetch(url, init);
}
