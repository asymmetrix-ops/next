"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { buildCalendlyUrl } from "@/lib/prospect";

type CalendlyWindow = Window & {
  Calendly?: {
    initInlineWidget: (opts: {
      url: string;
      parentElement: HTMLElement;
      resize?: boolean;
    }) => void;
  };
};

interface CalendlyEmbedProps {
  email?: string | null;
  minHeight?: number;
}

export default function CalendlyEmbed({
  email,
  minHeight = 480,
}: CalendlyEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const calendlyUrl = buildCalendlyUrl(email);

  const initWidget = () => {
    const container = containerRef.current;
    const Calendly = (window as CalendlyWindow).Calendly;
    if (!container || !Calendly) return;

    initializedRef.current = true;
    container.replaceChildren();
    Calendly.initInlineWidget({
      url: calendlyUrl,
      parentElement: container,
      resize: true,
    });
  };

  useEffect(() => {
    initializedRef.current = false;
    if ((window as CalendlyWindow).Calendly) {
      initWidget();
    }
  }, [calendlyUrl]);

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
        className="calendly-embed w-full"
        style={{ minWidth: 320, minHeight }}
      />
    </>
  );
}
