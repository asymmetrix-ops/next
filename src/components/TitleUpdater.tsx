"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const titleMap: Array<{
  pattern: RegExp;
  title: (match: RegExpMatchArray) => string;
}> = [
  { pattern: /^\/?$/, title: () => "Asymmetrix – Home" },
  { pattern: /^\/companies(\/)?$/, title: () => "Asymmetrix – Companies" },
  { pattern: /^\/company\/[^/]+$/, title: () => "Asymmetrix – Company" },
  { pattern: /^\/investors(\/)?$/, title: () => "Asymmetrix – Investors" },
  { pattern: /^\/investors\/[^/]+$/, title: () => "Asymmetrix – Investor" },
  { pattern: /^\/individuals(\/)?$/, title: () => "Asymmetrix – Individuals" },
  { pattern: /^\/individual\/[^/]+$/, title: () => "Asymmetrix – Individual" },
  { pattern: /^\/advisors(\/)?$/, title: () => "Asymmetrix – Advisors" },
  { pattern: /^\/advisor\/[^/]+$/, title: () => "Asymmetrix – Advisor" },
  { pattern: /^\/sectors(\/)?$/, title: () => "Asymmetrix – Sectors" },
  { pattern: /^\/sector\/[^/]+$/, title: () => "Asymmetrix – Sector" },
  {
    pattern: /^\/insights-analysis(\/)?$/,
    title: () => "Asymmetrix – Insights & Analysis",
  },
  {
    pattern: /^\/corporate-events(\/)?$/,
    title: () => "Asymmetrix – Corporate Events",
  },
  {
    pattern: /^\/corporate-event\/[^/]+$/,
    title: () => "Asymmetrix – Corporate Event",
  },
  { pattern: /^\/about-us(\/)?$/, title: () => "Asymmetrix – About" },
  { pattern: /^\/login(\/)?$/, title: () => "Asymmetrix – Login" },
  { pattern: /^\/register(\/)?$/, title: () => "Asymmetrix – Register" },
];

export default function TitleUpdater() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    // Do not override server-provided metadata titles on dynamic detail routes
    const dynamicDetailRoutePatterns = [
      /^\/article\/[^/]+$/, // article detail pages use generateMetadata
      /^\/sector\/[^/]+$/, // sector detail pages use generateMetadata
      /^\/company\/[^/]+$/, // company detail pages use generateMetadata
      /^\/individual\/[^/]+$/, // individual detail pages use generateMetadata
      /^\/corporate-event\/[^/]+$/, // corporate event detail pages use generateMetadata
    ];

    if (dynamicDetailRoutePatterns.some((re) => re.test(pathname))) {
      return; // let Next.js metadata control the document title
    }

    const entry = titleMap.find((e) => pathname.match(e.pattern));
    const computed = entry
      ? entry.title(pathname.match(entry.pattern) as RegExpMatchArray)
      : `Asymmetrix`;
    if (typeof document !== "undefined") {
      document.title = computed;
    }
  }, [pathname]);

  return null;
}
