import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { XANO_HOST } from "@/lib/apiBase";

export const runtime = "nodejs";

// Only these hosts may be proxied — the Xano vault (which itself 302s to the
// GCS-hosted file). This is a public route, so the allowlist prevents it
// being used as an open fetch-anything proxy.
const ALLOWED_HOSTS = new Set([
  "xdil-abvj-o7rq.e2.xano.io",
  new URL(XANO_HOST).hostname,
  "storage.googleapis.com",
]);

const HOP_BY_HOP_REQUEST_HEADERS = new Set(["host", "connection"]);
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "last-modified",
  "etag",
];

function isAllowedUrl(url: URL): boolean {
  return (url.protocol === "https:" || url.protocol === "http:") &&
    ALLOWED_HOSTS.has(url.hostname);
}

/**
 * Streams a Xano-vault / GCS PDF through our own origin.
 *
 * Fetching these files directly from the browser breaks in Safari: pdf.js
 * issues cross-origin Range-request fetches (with an Authorization header)
 * to the Xano vault URL, which 302-redirects to storage.googleapis.com.
 * WebKit reports the redirected request's Origin as "null" in that
 * combination, and GCS's CORS config rejects it. Proxying server-side makes
 * the browser's request same-origin, sidestepping the issue entirely.
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }
  // Optional: forces the browser to save the file instead of rendering it
  // inline, and lets us control the suggested filename (e.g. for the
  // "Download PDF" button next to the embedded viewer).
  const downloadName = req.nextUrl.searchParams.get("download");

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }

  if (!isAllowedUrl(target)) {
    return new Response("URL host not allowed", { status: 403 });
  }

  const upstreamHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) return;
    if (key.toLowerCase() === "range" || key.toLowerCase() === "authorization") {
      upstreamHeaders.set(key, value);
    }
  });

  // A plain <a download> navigation (used by the "Download PDF" button)
  // can't attach an Authorization header. Fall back to the auth cookie so
  // the download still works without requiring a fetch/blob round-trip.
  if (!upstreamHeaders.has("authorization")) {
    const cookieToken = (await cookies())
      .get("asymmetrix_auth_token")
      ?.value?.trim();
    if (cookieToken) {
      upstreamHeaders.set("Authorization", `Bearer ${cookieToken}`);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      redirect: "follow",
    });
  } catch {
    return new Response("Failed to fetch upstream document", { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const key of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  if (downloadName) {
    const safeName = downloadName.replace(/["\r\n]/g, "").trim() || "document.pdf";
    responseHeaders.set(
      "content-disposition",
      `attachment; filename="${safeName}"`
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
