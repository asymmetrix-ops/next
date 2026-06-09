/** Singular user portfolio, portfolio/data, get_users_lists, user_lists, list/data, portfolio/entities, lists/{id}/entities, lists/entity/check, lists/{id} rename, user_lists/{id} delete. */
export const XANO_USER_PORTFOLIO_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI";

/** Legacy list routes still on xbsQ0H4R (single-list GET). */
export const XANO_PORTFOLIO_LISTS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R";

export type CreateUserListPayload = {
  portfolio_label: string;
  user_id: number;
  followed_companies: number[];
  followed_sectors: number[];
  followed_individuals: number[];
  followed_investors: number[];
  followed_advisors: number[];
};

export function buildCreateUserListPayload(
  portfolioLabel: string,
  userId: number
): CreateUserListPayload {
  return {
    portfolio_label: portfolioLabel.trim(),
    user_id: userId,
    followed_companies: [],
    followed_sectors: [],
    followed_individuals: [],
    followed_investors: [],
    followed_advisors: [],
  };
}
