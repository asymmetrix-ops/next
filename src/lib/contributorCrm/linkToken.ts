/**
 * Signed contributor link tokens: `<companyId>.<expiryEpochSeconds>.<nonce>.<signature>`.
 * Created by the CMS when an outreach email is sent, verified here. Stateless:
 * both sides share CONTRIBUTOR_LINK_SECRET. Uses Web Crypto so it also runs in
 * middleware (edge runtime).
 */
export const CONTRIBUTOR_SESSION_COOKIE = "contributor_session";
/** Header the middleware sets on contributor API requests (always overwritten). */
export const CONTRIBUTOR_COMPANY_HEADER = "x-contributor-company";

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type ContributorSession = { companyId: number; expiresAt: number };

/** Returns the company the token is bound to, or null if invalid/expired. */
export async function verifyContributorToken(
  token: string | null | undefined,
  secret: string | undefined
): Promise<ContributorSession | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, exp, nonce, signature] = parts;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(exp) || !nonce) return null;
  const expected = await sign(secret, `${id}.${exp}.${nonce}`);
  if (!safeEqual(expected, signature)) return null;
  const expiresAt = Number(exp);
  if (expiresAt * 1000 < Date.now()) return null;
  return { companyId: Number(id), expiresAt };
}
