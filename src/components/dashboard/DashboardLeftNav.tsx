"use client";

import Link from "next/link";
import Image from "next/image";
import { getInitials } from "@/lib/userDisplay";
import {
  Bars3Icon,
  HomeIcon,
  ViewfinderCircleIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UsersIcon,
  BriefcaseIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  Squares2X2Icon,
  BookmarkIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export type DashboardNavCounts = {
  companies?: number;
  corporateEvents?: number;
  investors?: number;
  advisors?: number;
  individuals?: number;
  sectors?: number;
  insightsAnalysis?: number;
  dealRadar?: number;
  financialIntelligence?: number;
};

type NavSection = {
  key: keyof DashboardNavCounts | "dashboard" | "myPortfolio";
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const SECTIONS: NavSection[] = [
  { key: "dealRadar", label: "Deal Radar", href: "/deal-radar", icon: ViewfinderCircleIcon },
  { key: "companies", label: "Companies", href: "/companies", icon: BuildingOfficeIcon },
  { key: "sectors", label: "Sectors", href: "/sectors", icon: ChartBarIcon },
  { key: "investors", label: "Investors", href: "/investors", icon: UsersIcon },
  { key: "advisors", label: "Advisors", href: "/advisors", icon: BriefcaseIcon },
  { key: "individuals", label: "Individuals", href: "/individuals", icon: UserGroupIcon },
  { key: "corporateEvents", label: "Corporate Events", href: "/corporate-events", icon: CalendarDaysIcon },
  { key: "insightsAnalysis", label: "Insights & Analysis", href: "/insights-analysis", icon: LightBulbIcon },
  { key: "financialIntelligence", label: "Financial Intelligence", href: "/financial-intelligence", icon: Squares2X2Icon },
];

function formatCount(n: number | undefined): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return n.toLocaleString();
}

export default function DashboardLeftNav({
  open,
  onToggleOpen,
  counts,
  userName,
  onLogout,
}: {
  open: boolean;
  onToggleOpen: () => void;
  counts: DashboardNavCounts;
  userName?: string | null;
  onLogout: () => void;
}) {
  return (
    <aside
      className={`dash-leftnav h-full shrink-0 flex flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-out ${
        open ? "w-[240px]" : "w-[64px]"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-3 border-b border-gray-100 shrink-0 ${
          open ? "" : "justify-center px-0"
        }`}
      >
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={open ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={open}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors shrink-0"
        >
          <Bars3Icon className="w-[18px] h-[18px]" />
        </button>
        {open && (
          <Link href="/home-user" className="flex items-center justify-center w-7 h-7 shrink-0" aria-label="Asymmetrix Dashboard">
            <Image
              src="/icons/logo.svg"
              alt="Asymmetrix"
              width={28}
              height={28}
              style={{ width: 28, height: 28, objectFit: "contain" }}
              priority
            />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <NavRow
          open={open}
          href="/home-user"
          label="Dashboard"
          icon={HomeIcon}
          count={null}
          active
        />
        {SECTIONS.map((s) => (
          <NavRow
            key={s.key}
            open={open}
            href={s.href}
            label={s.label}
            icon={s.icon}
            count={formatCount(counts[s.key as keyof DashboardNavCounts])}
          />
        ))}
        <NavRow
          open={open}
          href="/my-portfolio"
          label="My Portfolio"
          icon={BookmarkIcon}
          count={null}
        />
      </nav>

      <div
        className={`border-t border-gray-100 p-2 shrink-0 flex items-center gap-1 ${
          open ? "" : "flex-col gap-2"
        }`}
      >
        <Link
          href="/settings"
          title="Settings"
          aria-label="Settings"
          className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
        >
          <Cog6ToothIcon className="w-[18px] h-[18px]" />
        </Link>
        <Link
          href="/my-info"
          title="Your info"
          aria-label="Your info"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 hover:bg-blue-700 transition-colors"
        >
          {getInitials(userName)}
        </Link>
        {open && (
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 whitespace-nowrap"
          >
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}

function NavRow({
  open,
  href,
  label,
  icon: Icon,
  count,
  active,
}: {
  open: boolean;
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count: string | null;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={!open ? label : undefined}
      className={`group flex items-center gap-3 rounded-full px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
      } ${open ? "" : "justify-center"}`}
    >
      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
      {open && (
        <span className="flex items-center flex-1 min-w-0 gap-2">
          <span className="truncate">{label}</span>
          {count && (
            <span className="ml-auto text-[10.5px] font-bold text-gray-400 group-hover:text-blue-600 tabular-nums shrink-0">
              {count}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
