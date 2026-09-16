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

function formatCount(n: number | undefined): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return n.toLocaleString();
}

export default function AppLeftNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const [counts, setCounts] = useState<NavCounts>({});

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
      className={`sticky top-0 h-screen shrink-0 flex flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-out ${
        open ? "w-[240px]" : "w-[64px]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={open}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors shrink-0"
        >
          <Bars3Icon className="w-[18px] h-[18px]" />
        </button>
        <Link
          href={DASHBOARD_HREF}
          className="flex items-center justify-center w-7 h-7 shrink-0"
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
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
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

      <div className="border-t border-gray-100 p-2 shrink-0 flex items-center gap-1">
        <Link
          href="/settings"
          title="Settings"
          aria-label="Settings"
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${
            pathname.startsWith("/settings")
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          <Cog6ToothIcon className="w-[18px] h-[18px]" />
        </Link>
        {open && (
          <button
            type="button"
            onClick={handleLogout}
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
      <Icon
        className={`w-[18px] h-[18px] shrink-0 ${
          active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
        }`}
      />
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
