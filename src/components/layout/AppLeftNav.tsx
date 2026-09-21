"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import { trackLogout } from "@/lib/tracking";
import { getInitials } from "@/lib/userDisplay";
import { useNavOpen } from "./NavOpenContext";

type NavCounts = {
  companies?: number;
  corporateEvents?: number;
  investors?: number;
  advisors?: number;
  individuals?: number;
  sectors?: number;
  insightsAnalysis?: number;
  dealRadar?: number;
};

type NavSection = {
  key: keyof NavCounts;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isActive: (pathname: string) => boolean;
};

const SECTIONS: NavSection[] = [
  {
    key: "dealRadar",
    label: "Deal Radar",
    href: "/deal-radar",
    icon: ViewfinderCircleIcon,
    isActive: (p) => p.startsWith("/deal-radar"),
  },
  {
    key: "companies",
    label: "Companies",
    href: "/companies",
    icon: BuildingOfficeIcon,
    isActive: (p) =>
      p.startsWith("/companies") ||
      p.startsWith("/company/") ||
      p.startsWith("/new_company/"),
  },
  {
    key: "sectors",
    label: "Sectors",
    href: "/sectors",
    icon: ChartBarIcon,
    isActive: (p) =>
      p.startsWith("/sectors") ||
      p.startsWith("/sector/") ||
      p.startsWith("/sub-sector/"),
  },
  {
    key: "investors",
    label: "Investors",
    href: "/investors",
    icon: UsersIcon,
    isActive: (p) => p.startsWith("/investors") || p.startsWith("/investor/"),
  },
  {
    key: "advisors",
    label: "Advisors",
    href: "/advisors",
    icon: BriefcaseIcon,
    isActive: (p) => p.startsWith("/advisors") || p.startsWith("/advisor/"),
  },
  {
    key: "individuals",
    label: "Individuals",
    href: "/individuals",
    icon: UserGroupIcon,
    isActive: (p) =>
      p.startsWith("/individuals") || p.startsWith("/individual/"),
  },
  {
    key: "corporateEvents",
    label: "Corporate Events",
    href: "/corporate-events",
    icon: CalendarDaysIcon,
    isActive: (p) =>
      p.startsWith("/corporate-events") || p.startsWith("/corporate-event/"),
  },
  {
    key: "insightsAnalysis",
    label: "Insights & Analysis",
    href: "/insights-analysis",
    icon: LightBulbIcon,
    isActive: (p) =>
      p.startsWith("/insights-analysis") || p.startsWith("/article/"),
  },
];

const FINANCIAL_INTELLIGENCE_HREF = "/financial-intelligence";
const MY_PORTFOLIO_HREF = "/my-portfolio";
const DASHBOARD_HREF = "/home-user";

/** Expanded / collapsed widths — keep in sync with Tailwind width transition. */
const NAV_WIDTH_EXPANDED_PX = 240;
const NAV_WIDTH_COLLAPSED_PX = 64;

const NAV_SLIDE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const NAV_SLIDE_MS = 320;

const navRevealClass = (open: boolean) =>
  [
    "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] motion-reduce:transition-none",
    open ? "max-w-[168px] opacity-100" : "max-w-0 opacity-0",
  ].join(" ");

function formatCount(n: number | undefined): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return n.toLocaleString();
}

export default function AppLeftNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, logout } = useAuth();
  // Shared via context (not local state) so page content — e.g. the
  // Insights & Analysis grid — can read open/collapsed too, and so it
  // persists across navigations instead of resetting on every page mount.
  const { open, setOpen } = useNavOpen();
  const [counts, setCounts] = useState<NavCounts>({});

  const toggleOpen = () => setOpen((v) => !v);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const [
        companiesRes,
        eventsRes,
        individualsRes,
        sectorsRes,
        advisorsRes,
        investorsRes,
      ] = await Promise.allSettled([
        dashboardApiService.getHeroScreenStatisticCompanies(),
        dashboardApiService.getHeroScreenStatisticEventsCount(),
        dashboardApiService.getAllIndividualsCount(),
        dashboardApiService.getHeroScreenStatisticSectors(),
        dashboardApiService.getHeroScreenStatisticAdvisorsCount(),
        dashboardApiService.getHeroScreenStatisticInvestors(),
      ]);
      if (cancelled) return;

      const next: NavCounts = {};

      if (companiesRes.status === "fulfilled") {
        const n = Number(companiesRes.value);
        if (Number.isFinite(n)) next.companies = n;
      }
      if (eventsRes.status === "fulfilled") {
        const v = eventsRes.value as unknown as Record<string, unknown>;
        const n = Number(v?.Corporate_Events_count);
        if (Number.isFinite(n)) next.corporateEvents = n;
      }
      if (individualsRes.status === "fulfilled") {
        const v = individualsRes.value as unknown as Record<string, unknown>;
        const n = Number(v?.count);
        if (Number.isFinite(n)) next.individuals = n;
      }
      if (sectorsRes.status === "fulfilled") {
        const v = sectorsRes.value as unknown as Record<string, unknown>;
        const n = Number(v?.primarySectors);
        if (Number.isFinite(n)) next.sectors = n;
      }
      if (advisorsRes.status === "fulfilled") {
        const v = advisorsRes.value as unknown as Record<string, unknown>;
        const n = Number(v?.Advisorc_companies_count);
        if (Number.isFinite(n)) next.advisors = n;
      }
      if (investorsRes.status === "fulfilled") {
        const v = investorsRes.value as unknown as Record<string, unknown>;
        const pe = Number(v?.peInvestors) || 0;
        const vc = Number(v?.vcInvestors) || 0;
        const total = pe + vc;
        if (total > 0) next.investors = total;
      }

      setCounts((prev) => ({ ...prev, ...next }));
    };

    run().catch(() => {
      // Leave counts unset — nav renders without a number rather than a fake one.
    });

    const runDealRadarCount = async () => {
      try {
        const res = await dashboardApiService.getDealRadar({
          limit: 1,
          offset: 0,
        });
        if (cancelled) return;
        if (typeof res.total_items === "number") {
          setCounts((prev) => ({ ...prev, dealRadar: res.total_items }));
        }
      } catch {
        // Leave unset.
      }
    };
    runDealRadarCount();

    const runInsightsCount = async () => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return;
      try {
        const params = new URLSearchParams({
          Offset: "0",
          Per_page: "1",
          portfolio_only: "false",
        });
        const res = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/Get_All_Content_Articles?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-Data-Source": "live",
            },
          }
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { itemsTotal?: number };
        if (!cancelled && typeof json.itemsTotal === "number") {
          setCounts((prev) => ({ ...prev, insightsAnalysis: json.itemsTotal }));
        }
      } catch {
        // Leave unset.
      }
    };
    runInsightsCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useMemo(
    () => () => {
      const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
      trackLogout(Number.isFinite(userId) ? userId : 0);
      logout();
      router.push("/login");
    },
    [user?.id, logout, router]
  );

  return (
    <aside
      className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white motion-reduce:transition-none"
      style={{
        width: open ? NAV_WIDTH_EXPANDED_PX : NAV_WIDTH_COLLAPSED_PX,
        transition: `width ${NAV_SLIDE_MS}ms ${NAV_SLIDE_EASE}`,
      }}
    >
      <div className="flex shrink-0 flex-col items-start gap-2 border-b border-gray-100 px-3 py-3">
        <Link
          href={DASHBOARD_HREF}
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          aria-label="Asymmetrix Dashboard"
        >
          <Image
            src="/icons/logo.svg"
            alt="Asymmetrix"
            width={28}
            height={28}
            style={{ width: 28, height: 28, objectFit: "contain" }}
            priority
          />
        </Link>
        <button
          type="button"
          onClick={toggleOpen}
          aria-label={open ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={open}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          <Bars3Icon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 pt-3">
        <NavRow
          open={open}
          href={DASHBOARD_HREF}
          label="Dashboard"
          icon={HomeIcon}
          count={null}
          active={pathname.startsWith("/home-user")}
        />
        {SECTIONS.map((s) => (
          <NavRow
            key={s.key}
            open={open}
            href={s.href}
            label={s.label}
            icon={s.icon}
            count={formatCount(counts[s.key])}
            active={s.isActive(pathname)}
          />
        ))}
        <NavRow
          open={open}
          href={FINANCIAL_INTELLIGENCE_HREF}
          label="Financial Intelligence"
          icon={Squares2X2Icon}
          count={null}
          active={pathname.startsWith(FINANCIAL_INTELLIGENCE_HREF)}
        />
        <NavRow
          open={open}
          href={MY_PORTFOLIO_HREF}
          label="My Portfolio"
          icon={BookmarkIcon}
          count={null}
          active={pathname.startsWith(MY_PORTFOLIO_HREF)}
        />
      </nav>

      <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 p-2">
        <Link
          href="/settings"
          title="Settings"
          aria-label="Settings"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          <Cog6ToothIcon className="h-[18px] w-[18px]" />
        </Link>
        <Link
          href="/my-info"
          title="Your info"
          aria-label="Your info"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white transition-colors hover:bg-blue-700"
        >
          {getInitials(user?.name)}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={`ml-auto px-2 text-sm font-medium text-gray-500 transition-[max-width,opacity] hover:text-blue-600 motion-reduce:transition-none ${navRevealClass(open)}`}
          style={{
            transitionDuration: `${NAV_SLIDE_MS}ms`,
            transitionTimingFunction: NAV_SLIDE_EASE,
          }}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
        >
          Log out
        </button>
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
      className={`group flex min-h-[40px] items-center rounded-full py-2 pl-2 pr-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
          }`}
        />
      </span>
      <span
        className={`flex min-w-0 flex-1 items-center gap-2 ${navRevealClass(open)}`}
        style={{
          transitionDuration: `${NAV_SLIDE_MS}ms`,
          transitionTimingFunction: NAV_SLIDE_EASE,
        }}
        aria-hidden={!open}
      >
        <span className="truncate">{label}</span>
        {count && (
          <span className="ml-auto shrink-0 text-[10.5px] font-bold tabular-nums text-gray-400 group-hover:text-blue-600">
            {count}
          </span>
        )}
      </span>
    </Link>
  );
}
