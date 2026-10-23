"use client";

import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { getInitials } from "@/lib/userDisplay";
import type { GlobalSearchResult } from "@/lib/globalSearch";

const AVATAR_COLORS = [
  { bg: "#FEE2E2", fg: "#DC2626" },
  { bg: "#DBEAFE", fg: "#1D4ED8" },
  { bg: "#EDE9FE", fg: "#7C3AED" },
  { bg: "#D1FAE5", fg: "#059669" },
  { bg: "#FEF3C7", fg: "#B45309" },
  { bg: "#E0E7FF", fg: "#4338CA" },
  { bg: "#FCE7F3", fg: "#DB2777" },
  { bg: "#CCFBF1", fg: "#0D9488" },
];

function colorForTitle(title: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function normalizeType(type: string): string {
  return String(type || "").toLowerCase().trim();
}

const ICON_TYPES = new Set([
  "sector",
  "sectors",
  "sub_sector",
  "sub-sector",
  "corporate_event",
  "corporate-events",
  "event",
  "insight",
  "insights",
  "article",
]);

type Props = {
  result: Pick<GlobalSearchResult, "title" | "type" | "logo">;
  size?: "sm" | "md";
};

export function GlobalSearchResultAvatar({ result, size = "md" }: Props) {
  const t = normalizeType(result.type);
  const boxClass =
    size === "sm"
      ? "h-8 w-8 rounded-md text-[12px]"
      : "h-9 w-9 rounded-lg text-[13px]";
  const iconClass = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  const logoSrc = result.logo ? resolveCompanyLogoSrc(result.logo) : null;
  if (logoSrc) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-gray-100 bg-white ${boxClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URIs */}
        <img src={logoSrc} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  if (ICON_TYPES.has(t)) {
    const Icon =
      t === "insight" || t === "insights" || t === "article"
        ? LightBulbIcon
        : t.startsWith("corporate") || t === "event"
          ? CalendarDaysIcon
          : ChartBarIcon;
    return (
      <span
        className={`flex shrink-0 items-center justify-center bg-gray-100 text-gray-500 ${boxClass}`}
      >
        <Icon className={iconClass} />
      </span>
    );
  }

  const color = colorForTitle(result.title || "?");
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-bold ${boxClass}`}
      style={{ background: color.bg, color: color.fg }}
    >
      {getInitials(result.title) || <BuildingOfficeIcon className={iconClass} />}
    </span>
  );
}
