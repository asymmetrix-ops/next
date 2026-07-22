"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { MCP_GUEST_CALENDLY_URL } from "@/lib/mcpGuest";

type CalendlyWindow = Window & {
  Calendly?: {
    initInlineWidget: (opts: {
      url: string;
      parentElement: HTMLElement;
      resize?: boolean;
    }) => void;
  };
};

type McpGuestCalendlyEmbedProps = {
  className?: string;
  height?: number;
};

export default function McpGuestCalendlyEmbed({
  className,
  height = 700,
}: McpGuestCalendlyEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const initWidget = () => {
    const container = containerRef.current;
    const Calendly = (window as CalendlyWindow).Calendly;
    if (!container || !Calendly || !MCP_GUEST_CALENDLY_URL) return;

    initializedRef.current = true;
    container.replaceChildren();
    Calendly.initInlineWidget({
      url: MCP_GUEST_CALENDLY_URL,
      parentElement: container,
      resize: true,
    });
  };

  useEffect(() => {
    initializedRef.current = false;
    if ((window as CalendlyWindow).Calendly) {
      initWidget();
    }
  }, []);

  if (!MCP_GUEST_CALENDLY_URL) {
    return null;
  }

  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!initializedRef.current) initWidget();
        }}
      />
      <div
        ref={containerRef}
        className={`calendly-embed w-full rounded-xl border border-gray-200 bg-white overflow-hidden ${className ?? ""}`}
        style={{ minWidth: 320, minHeight: height }}
      />
    </>
  );
}
