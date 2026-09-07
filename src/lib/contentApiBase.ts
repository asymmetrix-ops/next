const XANO_HOST = "https://xdil-abvj-o7rq.e2.xano.io";

/**
 * Content API group — requires user Bearer token.
 *
 * IMPORTANT: use the production branch (no `:develop` suffix), matching
 * every other endpoint in this same API group (Z3F6JUiu). Pointing this at
 * `:develop` caused genuine 401s for real users: valid production tokens
 * aren't valid against the develop branch, so every article fetch failed
 * auth and re-triggered the login modal even for already-authenticated
 * users.
 */
export const XANO_CONTENT_API_BASE = `${XANO_HOST}/api:Z3F6JUiu`;

export const XANO_CONTENT_URL = `${XANO_CONTENT_API_BASE}/content`;
