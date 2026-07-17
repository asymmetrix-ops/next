"use client";

import Script from "next/script";
import { MCP_GUEST_CALENDLY_URL } from "@/lib/mcpGuest";

type McpGuestCalendlyEmbedProps = {
  className?: string;
  height?: number;
};

export default function McpGuestCalendlyEmbed({
  className,
  height = 700,
}: McpGuestCalendlyEmbedProps) {
  if (!MCP_GUEST_CALENDLY_URL) {
    return null;
  }

  return (
    <>
      <div
        className={`calendly-inline-widget w-full rounded-xl border border-gray-200 bg-white overflow-hidden ${className ?? ""}`}
        data-url={MCP_GUEST_CALENDLY_URL}
        style={{ minWidth: 320, height }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
    </>
  );
}
