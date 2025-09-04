"use client";

import React, { useEffect, useRef } from "react";

export interface TradingViewSymbolOverviewProps {
  symbols: Array<{ label?: string; tvSymbol: string } | string>;
  width?: string | number;
  height?: string | number;
  locale?: string;
  colorTheme?: "light" | "dark";
  autosize?: boolean;
  showVolume?: boolean;
  showMA?: boolean;
}

// Lightweight client component to inject TradingView Symbol Overview widget
const TradingViewSymbolOverview: React.FC<TradingViewSymbolOverviewProps> = ({
  symbols,
  width = "100%",
  height = 300,
  locale = "en",
  colorTheme = "dark",
  autosize = true,
  showVolume = true,
  showMA = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget if any
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    widgetContainer.appendChild(inner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;

    const tvSymbols = symbols.map((s) => {
      if (typeof s === "string") return [s];
      if (s.label) return [s.label, s.tvSymbol];
      return [s.tvSymbol];
    });

    const config = {
      symbols: tvSymbols,
      width,
      height,
      locale,
      colorTheme,
      autosize,
      showVolume,
      showMA,
    } as const;

    script.innerHTML = JSON.stringify(config);

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [
    symbols,
    width,
    height,
    locale,
    colorTheme,
    autosize,
    showVolume,
    showMA,
  ]);

  return <div ref={containerRef} />;
};

export default TradingViewSymbolOverview;
