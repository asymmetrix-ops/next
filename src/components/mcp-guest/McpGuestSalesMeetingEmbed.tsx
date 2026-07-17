"use client";

import Script from "next/script";
import { MCP_GUEST_SALES_MEETINGS_URL } from "@/lib/mcpGuest";

function toEmbedUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.includes("embed=true")) return trimmed;
  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}embed=true`;
}

export default function McpGuestSalesMeetingEmbed() {
  const embedSrc = toEmbedUrl(MCP_GUEST_SALES_MEETINGS_URL);

  if (!embedSrc) {
    return null;
  }

  return (
    <>
      <div
        className="meetings-iframe-container w-full min-h-[680px] rounded-xl border border-gray-200 bg-white overflow-hidden"
        data-src={embedSrc}
      />
      <Script
        src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"
        strategy="lazyOnload"
      />
    </>
  );
}
