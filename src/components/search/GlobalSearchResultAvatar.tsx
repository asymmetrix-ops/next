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
  { bg: "rgb(var(--palette-red-100))", fg: "rgb(var(--palette-text-red-600))" },
  { bg: "rgb(var(--palette-blue-100))", fg: "rgb(var(--palette-text-blue-700))" },
  { bg: "rgb(var(--palette-violet-100))", fg: "rgb(var(--palette-text-violet-600))" },
  { bg: "rgb(var(--palette-emerald-100))", fg: "rgb(var(--palette-text-emerald-600))" },
  { bg: "rgb(var(--palette-amber-100))", fg: "rgb(var(--palette-text-amber-700))" },
  { bg: "rgb(var(--palette-indigo-100))", fg: "rgb(var(--palette-text-indigo-700))" },
  { bg: "rgb(var(--palette-pink-100))", fg: "rgb(var(--palette-text-pink-600))" },
  { bg: "rgb(var(--palette-teal-100))", fg: "rgb(var(--palette-text-teal-600))" },
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
        className={`logo-tile flex shrink-0 items-center justify-center overflow-hidden border border-gray-100 bg-white ${boxClass}`}
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
