import { decodeJwt, type JWTPayload } from "jose";

export type ArticleVisibilityTier = "Admin" | "Client" | "Public";

/** Align with admin content editor visibility coercion. */
export function normalizeArticleVisibility(
  raw: unknown
): ArticleVisibilityTier {
  const s = String(raw ?? "").trim();
  if (!s) return "Admin";
  const lower = s.toLowerCase();
  if (lower === "admin") return "Admin";
  if (lower === "client") return "Client";
  if (lower === "public") return "Public";
  if (lower === "published") return "Public";
  if (lower === "private") return "Client";
  if (lower === "draft") return "Admin";
  return "Admin";
}

export function isPublicArticleVisibility(raw: unknown): boolean {
  return normalizeArticleVisibility(raw) === "Public";
}

function rolesFromUser(user: unknown): string[] {
  const u = user as { roles?: unknown } | null | undefined;
  if (!u || !Array.isArray(u.roles)) return [];
  return u.roles.map((role) => String(role).toLowerCase());
}

/** Matches admin tooling: JWT claims and/or AuthProvider user roles. */
export function isAdminSession(token: string | null, user: unknown): boolean {
  let tokenStatus = "";
  if (token) {
    try {
      const claims = decodeJwt(token) as JWTPayload & Record<string, unknown>;
      const raw = claims.status ?? claims.Status ?? claims.role;
      tokenStatus = typeof raw === "string" ? raw : "";
    } catch {
      tokenStatus = "";
    }
  }

  const u = user as Record<string, unknown> | null | undefined;
  const userStatus = String(u?.Status ?? u?.status ?? u?.role ?? "").toLowerCase();
  const roles = rolesFromUser(user);

  return (
    tokenStatus.toLowerCase() === "admin" ||
    userStatus === "admin" ||
    roles.includes("admin")
  );
}

/**
 * Article route access: Public & Client require any authenticated session;
 * Admin-tier content is restricted to admin users.
 */
export function canUserViewArticle(
  visibilityRaw: unknown,
  token: string | null,
  user: unknown
): boolean {
  if (!token) return false;
  const tier = normalizeArticleVisibility(visibilityRaw);
  if (tier === "Public" || tier === "Client") return true;
  return isAdminSession(token, user);
}
