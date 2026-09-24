"use client";

import "./dashboard.css";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarDaysIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import AppLeftNav from "@/components/layout/AppLeftNav";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { NavOpenProvider, useNavOpen } from "@/components/layout/NavOpenContext";
import RequestDataResearchButton from "@/components/RequestDataResearchButton";
import { NewFeatureCallout } from "@/components/ui/new-feature-callout";
import {
  appendDealRadarItems,
  getDealRadarContentCtaLabel,
  mapDealRadarItem,
  COUNTRY_FLAG_INLINE_SIZE_PX,
  readHqCountryIso2,
  type DealRadarItem,
} from "@/lib/dealRadar";
import { CorporateEventTargetLink, CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { normalizeEntityHref as sharedNormalizeEntityHref } from "@/lib/corporateEventEntityHref";
import { getInsightHqCountryIso2 } from "@/lib/insightCountry";
import NewsArticleCard from "@/components/NewsArticleCard";
import { getNewsSubType, isNewsArticle } from "@/lib/contentArticleDisplay";
import type { ContentArticle } from "@/types/insightsAnalysis";
import {
  getContentTypeAccentColor,
  getContentTypeBadgeStyle,
} from "@/lib/contentTypeBadge";
import { TransactionStatusPill } from "@/components/tags/TransactionStatusPill";
import { locationsService } from "@/lib/locationsService";
import { normalizeSectorName } from "@/components/corporate-events/corporateEventsTableUtils";
import { buildDealRadarCompaniesViewAllHref } from "@/lib/companiesSearchUrl";
import { CappedMultiValueLinks } from "@/components/search/CappedMultiValueLinks";
import {
  entityLinksToMultiValueItems,
  namesToMultiValueItems,
} from "@/components/search/searchMultiValueUtils";
import { DEFAULT_TAG_CAP } from "@/components/redesign/primitives";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for dashboard data
interface CorporateEvent {
  id?: number;
  corporate_event_id?: number;
  description: string;
  announcement_date?: string;
  // New home events endpoint fields
  date?: string;
  type?: string;
  target?: unknown;
  investors?: unknown;
  amount?: unknown;
  primary?: unknown;
  secondary?: unknown;
  buyers?: unknown;
  sales?: unknown;
  all_targets?: unknown;
  deal_status?: string;
  created_at?: number;
  Target_Counterparty?: {
    new_company?: {
      name: string;
      _locations?: {
        Country: string;
      };
      _sectors_objects?: {
        sectors_id: Array<{
          sector_name: string;
          Sector_importance: string;
          // When a sector is Secondary, API may include related Primary sectors here
          Related_to_primary_sectors?: Array<
            | {
                id: number;
                sector_name: string;
                Sector_importance: string;
              }
            | {
                secondary_sectors?: {
                  id?: number;
                  sector_name?: string;
                  Sector_importance?: string;
                };
              }
          >;
        }>;
      };
    };
  };
  deal_type?: string;
  investment_data?: {
    investment_amount_m?: string;
    currrency?: {
      Currency: string;
    };
  };
  ev_data?: {
    enterprise_value_m?: string;
    Currency?: string;
  };
  Other_Counterparties_of_Corporate_Event?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
  Advisors_of_Corporate_Event?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

interface InsightArticle {
  id: number;
  Headline: string;
  Strapline?: string;
  Publication_Date?: string;
  created_at?: number;
  // Content type fields may arrive in different shapes/keys
  Content_Type?: string;
  content_type?: string;
  Content?: {
    Content_type?: string;
    Content_Type?: string;
    News_Sub_Type?: string;
    news_sub_type?: string;
  };
  News_Sub_Type?: string;
  news_sub_type?: string;
  keywords?: string[];
  related_documents?: Array<{
    url: string;
  }>;
  image?: string;
  companies_mentioned?: Array<{
    id: number;
    name: string;
    locations_id: number;
    _locations: {
      Country: string;
    };
    _is_that_investor: boolean;
  }>;
  Transaction_status?: string;
  transaction_status?: string;
  hq_country_iso2?: string | null;
  hqCountryIso2?: string | null;
  Company_of_Focus?: Array<{
    id?: number;
    Transaction_status?: string;
    hq_country_iso2?: string | null;
    hqCountryIso2?: string | null;
    hq_iso2?: string | null;
  }>;
}

function dashNewsSubtypeTagClass(subtype: string): string {
  const s = subtype.toLowerCase().trim();
  if (s.includes("fundraise")) return "dash-tag dash-tag-fund";
  if (s.includes("sale process")) return "dash-tag dash-tag-sale";
  if (s.includes("deal close")) return "dash-tag dash-tag-close";
  if (s.includes("carve")) return "dash-tag dash-tag-carve";
  if (s === "ipo") return "dash-tag dash-tag-ipo";
  return "dash-tag dash-tag-lead";
}

function getInsightTransactionStatus(article: InsightArticle): string {
  const top = (article.Transaction_status || article.transaction_status || "")
    .trim();
  const raw =
    top ||
    article.Company_of_Focus?.find((c) => c?.Transaction_status)
      ?.Transaction_status?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/^transaction\s+/i, "").trim() || raw;
}

const DEAL_STAGE_DEFINITIONS = [
  {
    label: "Reported in Market",
    description:
      "Substantiated by credible media outlets or company press releases that a sale process is actively underway.",
    styleKey: "reported",
  },
  {
    label: "Rumored in Market",
    description:
      "Based on proprietary intelligence obtained by Asymmetrix suggesting the asset is in market and a sale process has begun or will commence imminently.",
    styleKey: "rumored",
  },
  {
    label: "Anticipated within 18 months",
    description:
      "Asymmetrix assessment that a transaction is expected in the near- to medium-term based on factors such as sponsor fund lifecycle, ownership hold period, increase in transaction activity in company's sector or market chatter.",
    styleKey: "anticipated",
  },
  {
    label: "Process on Hold",
    description:
      "A sale process was launched but has been paused or failed. The transaction may resume later but is not actively progressing at present.",
    styleKey: "hold",
  },
] as const;

function DealStageInfoTooltip() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const padding = 16;
    const gap = 10;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popoverW = popover?.offsetWidth ?? 360;
    const popoverH = popover?.offsetHeight ?? 420;
    const spaceRight = viewportW - rect.right - padding;
    const spaceLeft = rect.left - padding;
    const showLeft = spaceRight < popoverW + gap && spaceLeft > spaceRight;

    let left = showLeft ? rect.left - gap - popoverW : rect.right + gap;
    left = Math.max(padding, Math.min(left, viewportW - popoverW - padding));

    // Anchor below the icon so it clears the table header.
    let top = rect.bottom + gap + 6;
    if (top + popoverH > viewportH - padding) {
      top = Math.max(padding, viewportH - popoverH - padding);
    }

    setPopoverStyle({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(() => {
      updatePosition();
      requestAnimationFrame(updatePosition);
    });
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!(e.target instanceof Node)) return;
      if (anchor?.contains(e.target)) return;
      if (popover?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Deal stage definitions"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onClick={() => {
          updatePosition();
          setOpen((prev) => !prev);
        }}
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            className="fixed z-[9999] w-[min(22.5rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-xl"
            style={popoverStyle}
            onMouseEnter={show}
            onMouseLeave={() => setOpen(false)}
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Deal stage</div>
            </div>
            <div className="px-4 py-3">
              <div className="space-y-4">
                {DEAL_STAGE_DEFINITIONS.map((item, index) => {
                  return (
                    <div
                      key={item.label}
                      className={
                        index < DEAL_STAGE_DEFINITIONS.length - 1
                          ? "border-b border-gray-100 pb-4"
                          : undefined
                      }
                    >
                      <TransactionStatusPill
                        status={item.label}
                        className="inline-block max-w-full"
                      />
                      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}


// Removed NewCompany interface along with the related UI section

function HomeUserPageContent() {
  const router = useRouter();
  const {
    isAuthenticated,
    loading: authLoading,
    isTrialActive,
    trialDaysLeft,
  } = useAuth();
  // Right-click handled via native anchors now

  const { open: leftNavOpen } = useNavOpen();

  // Helper function to format dates consistently
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not Available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Resolve corporate event id from inconsistent API shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCorporateEventId = (ev: any): number | undefined => {
    const possible = (ev?.id ??
      ev?.event_id ??
      ev?.events_id ??
      ev?.corporate_event_id ??
      ev?.corporate_events_id ??
      ev?.CorporateEvent_id ??
      ev?.Corporate_Events_id) as unknown;
    const n = Number(possible);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // (removed unused parseBraceList helper)

  // Safe JSON.parse for stringified objects like '{"Type":"Investment"}'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeParseJson = <T = any,>(value?: unknown): T | null => {
    if (!value || typeof value !== "string") return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  type SectorRef = { id: number; name: string };
  const parseSectorRefs = (value?: unknown): SectorRef[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return (value as unknown[])
        .map((v) => v as Partial<SectorRef>)
        .filter(
          (v): v is SectorRef =>
            typeof v?.id === "number" &&
            Number.isFinite(v.id) &&
            v.id > 0 &&
            typeof v?.name === "string" &&
            Boolean(v.name.trim())
        )
        .map((v) => ({ id: v.id, name: v.name.trim() }));
    }
    if (typeof value === "string") {
      const parsed = safeParseJson<unknown>(value);
      if (Array.isArray(parsed)) return parseSectorRefs(parsed);
      return [];
    }
    return [];
  };

  // Normalize entity link. Delegates to the shared corporate-events href
  // resolver (checks path/route/page_type/entity_type/is_investor, in that
  // order) instead of this page's own stale copy, which only ever checked
  // route/entity_type and defaulted everything else to `/company/{id}` —
  // including entities that were only ever identifiable as investors via the
  // `is_investor` flag, or via which bucket (e.g. `investors`) they came from.
  const normalizeEntityHref = (
    entity: unknown,
    opts?: { isInvestorHint?: boolean }
  ): string => {
    if (!entity || typeof entity !== "object") return "";
    const id = Number((entity as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) {
      const rawPath = String((entity as { path?: unknown }).path || "").trim();
      return rawPath ? rawPath.replace(/^\/investor\//, "/investors/") : "";
    }
    return (
      sharedNormalizeEntityHref({
        id,
        route: (entity as { route?: string }).route,
        page_type: (entity as { page_type?: string }).page_type,
        path: (entity as { path?: string }).path,
        entity_type: (entity as { entity_type?: string }).entity_type,
        is_investor: (entity as { is_investor?: boolean }).is_investor,
        isInvestorHint: opts?.isInvestorHint,
      }) ?? ""
    );
  };

  const dedupeById = (entities: EntityRef[]): EntityRef[] => {
    const seenIds = new Set<number>();
    const result: EntityRef[] = [];
    for (const e of entities) {
      const id = Number(e?.id);
      if (Number.isFinite(id) && id > 0) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      result.push(e);
    }
    return result;
  };

  type EntityRef = {
    id?: number;
    name?: string;
    path?: string;
    route?: string;
    page_type?: string;
    entity_type?: string;
    is_investor?: boolean;
    hq_country_iso2?: string | null;
    hqCountryIso2?: string | null;
  };

  const partyLinkClassName = "dash-ev-link";
  const partyOverflowClassName =
    "inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold px-1.5 py-0.5 cursor-pointer border-0 align-middle";
  const partyShowLessClassName =
    "text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer border-0 bg-transparent p-0 mt-0.5";

  const renderCappedEntityLinks = (
    entities: EntityRef[],
    keyPrefix: string,
    opts?: { isInvestorHint?: boolean }
  ): React.ReactNode => {
    const items = entityLinksToMultiValueItems(
      dedupeById(entities).map((entity) => ({
        id: entity.id,
        name: entity.name || "Unknown",
        href: normalizeEntityHref(entity, opts) || null,
        hqIso2: readHqCountryIso2(entity as unknown as Record<string, unknown>),
      })),
      keyPrefix
    );
    if (items.length === 0) return <span>Not Available</span>;
    return (
      <CappedMultiValueLinks
        items={items}
        max={DEFAULT_TAG_CAP}
        flagSize={COUNTRY_FLAG_INLINE_SIZE_PX}
        linkClassName={partyLinkClassName}
        overflowClassName={partyOverflowClassName}
        showLessClassName={partyShowLessClassName}
        emptyFallback={<span>Not Available</span>}
        onLinkClick={(e) => {
          const href = e.currentTarget.getAttribute("href");
          if (href) void router.push(href);
        }}
      />
    );
  };

  const renderCappedNameLinks = (
    names: string[],
    keyPrefix: string
  ): React.ReactNode => {
    const items = namesToMultiValueItems(names, keyPrefix);
    if (items.length === 0) return <span>Not Available</span>;
    return (
      <CappedMultiValueLinks
        items={items}
        max={DEFAULT_TAG_CAP}
        linkClassName={partyLinkClassName}
        overflowClassName={partyOverflowClassName}
        showLessClassName={partyShowLessClassName}
        emptyFallback={<span>Not Available</span>}
      />
    );
  };

  const renderTargetEntityInline = (
    entity: EntityRef,
    opts?: { trailingComma?: boolean; stackFlag?: boolean }
  ): React.ReactNode => {
    const href = normalizeEntityHref(entity);
    const name = entity?.name || "Unknown";

    return (
      <CorporateEventTargetLink
        name={name}
        href={href || undefined}
        entity={entity as unknown as Record<string, unknown>}
        linkClassName={partyLinkClassName}
        linkStyle={{ fontWeight: "500" }}
        trailingComma={opts?.trailingComma}
        stackFlag={opts?.stackFlag}
      />
    );
  };

  // Parse list of entities from new API fields which may be JSON strings or arrays
  const parseEntityArray = <T = unknown,>(value?: unknown): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as unknown[] as T[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to normalize primary sector(s) from either old or new shape
  const getRelatedPrimarySectors = (
    secondarySectorsOrObjects:
      | { sector_name: string }[]
      | {
          sector_name: string;
          Sector_importance: string;
          Related_to_primary_sectors?: Array<{
            secondary_sectors?: { sector_name?: string };
          }>;
        }[]
      | undefined
  ) => {
    if (!secondarySectorsOrObjects || secondarySectorsOrObjects.length === 0)
      return "Not available";

    // If new endpoint structure (contains Sector_importance), derive primaries from mapping
    if (
      typeof secondarySectorsOrObjects[0] === "object" &&
      (secondarySectorsOrObjects[0] as { Sector_importance?: string })
        .Sector_importance !== undefined
    ) {
      const sectors = secondarySectorsOrObjects as Array<{
        sector_name: string;
        Sector_importance: string;
        Related_to_primary_sectors?: Array<{
          secondary_sectors?: { sector_name?: string };
        }>;
      }>;
      const explicitPrimaries = sectors
        .filter((s) => s && s.Sector_importance === "Primary")
        .map((s) => s.sector_name)
        .filter(Boolean);
      const relatedFromSecondaries = sectors
        .filter((s) => s && s.Sector_importance !== "Primary")
        .flatMap((s) =>
          Array.isArray(s.Related_to_primary_sectors)
            ? (s.Related_to_primary_sectors.map(
                (r) =>
                  // Support both shapes: { sector_name } and { secondary_sectors: { sector_name } }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r as any)?.secondary_sectors?.sector_name ??
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r as any)?.sector_name
              ).filter(Boolean) as string[])
            : []
        );
      const combined = Array.from(
        new Set([...(explicitPrimaries as string[]), ...relatedFromSecondaries])
      );
      return combined.length > 0 ? combined.join(", ") : "Not available";
    }

    // Otherwise old shape (array of secondary names) – use fallback mapping
    const secondarySectors = secondarySectorsOrObjects as {
      sector_name: string;
    }[];
    const sectorMapping: { [key: string]: string } = {
      Crypto: "Web 3",
      Blockchain: "Web 3",
      DeFi: "Web 3",
      NFT: "Web 3",
      Web3: "Web 3",
      "Business Intelligence": "Data Analytics",
      "Data Science": "Data Analytics",
      "Machine Learning": "Data Analytics",
      AI: "Data Analytics",
      Analytics: "Data Analytics",
      "Big Data": "Data Analytics",
      "Cloud Computing": "Infrastructure",
      SaaS: "Software",
      Cybersecurity: "Security",
      FinTech: "Financial Services",
      InsurTech: "Financial Services",
      PropTech: "Real Estate",
      HealthTech: "Healthcare",
      EdTech: "Education",
      LegalTech: "Legal",
      HRTech: "Human Resources",
      MarTech: "Marketing",
      AdTech: "Advertising",
      Gaming: "Entertainment",
      "E-commerce": "Retail",
      Logistics: "Supply Chain",
      IoT: "Internet of Things",
      Robotics: "Automation",
    };
    const relatedPrimary = secondarySectors
      .map((s) => sectorMapping[s.sector_name] || s.sector_name)
      .filter((value, index, self) => self.indexOf(value) === index);
    return relatedPrimary.join(", ");
  };

  // Derive primary sector(s) for an event's target from provided structure
  const getEventPrimarySectors = (event: CorporateEvent): string => {
    const sectors =
      event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id ||
      [];

    // 1) Any explicitly marked Primary sectors
    const explicitPrimary = sectors
      .filter((s) => s && s.Sector_importance === "Primary")
      .map((s) => s.sector_name)
      .filter(Boolean);

    // 2) For Secondary sectors, collect their related primary sectors (from API)
    const relatedFromSecondaries = sectors
      .filter((s) => s && s.Sector_importance !== "Primary")
      .flatMap((s) =>
        Array.isArray(s.Related_to_primary_sectors)
          ? (s.Related_to_primary_sectors.map(
              (p) =>
                // Support both shapes: { sector_name } and { secondary_sectors: { sector_name } }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p as any)?.secondary_sectors?.sector_name ??
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p as any)?.sector_name
            ).filter(Boolean) as string[])
          : []
      );

    const combined = Array.from(
      new Set([...explicitPrimary, ...relatedFromSecondaries])
    );
    if (combined.length > 0) return combined.join(", ");

    // 3) Fallback: map secondary names via heuristic mapping (e.g., Crypto -> Web 3)
    const fallbackSecondaries = sectors
      .filter((s) => s && s.Sector_importance !== "Primary")
      .map((s) => ({ sector_name: s.sector_name }));
    const mapped = getRelatedPrimarySectors(fallbackSecondaries);
    return mapped || "Not Available";
  };

  // Corporate Event navigation handler with graceful fallback to search
  const handleCorporateEventClick = useCallback(
    (eventId?: number, description?: string) => {
      if (eventId) {
        router.push(`/corporate-event/${eventId}`);
        return;
      }
      if (description) {
        router.push(
          `/corporate-events?search=${encodeURIComponent(description)}`
        );
      }
    },
    [router]
  );

  const [isLoading, setIsLoading] = useState(true);

  const DEAL_RADAR_PAGE_LIMIT = 25;
  const DEAL_RADAR_SCROLL_THRESHOLD_PX = 48;

  const [dealRadarItems, setDealRadarItems] = useState<DealRadarItem[]>([]);
  const [dealRadarNextOffset, setDealRadarNextOffset] = useState<number | null>(
    null
  );
  const [dealRadarLoading, setDealRadarLoading] = useState(true);
  const [dealRadarLoadingMore, setDealRadarLoadingMore] = useState(false);
  const dealRadarFetchAbortRef = useRef<AbortController | null>(null);
  const dealRadarFetchGenerationRef = useRef(0);
  const dealRadarScrollRef = useRef<HTMLDivElement | null>(null);
  const dealRadarNextOffsetRef = useRef<number | null>(null);
  const dealRadarLoadingMoreRef = useRef(false);
  const dealRadarLoadedOffsetsRef = useRef<Set<number>>(new Set());
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(true);
  // Name -> id lookups so Corporate Events sector text (which the home
  // events endpoint often returns as plain names, unlike Deal Radar's
  // already-linked sector refs) can still render as links to /sector and
  // /sub-sector profiles.
  const [primarySectorNameToId, setPrimarySectorNameToId] = useState<
    Record<string, number>
  >({});
  const [secondarySectorNameToId, setSecondarySectorNameToId] = useState<
    Record<string, number>
  >({});
  const [insightsArticlesLoading, setInsightsArticlesLoading] = useState(true);
  const [insightsArticles, setInsightsArticles] = useState<InsightArticle[]>(
    []
  );
  const [homeNewsArticles, setHomeNewsArticles] = useState<InsightArticle[]>(
    []
  );
  // The hero-screen stat counts this used to fetch only fed the dashboard's
  // own left-nav badges; AppLeftNav now fetches those independently, so this
  // just gates the initial "Loading dashboard…" state.
  const fetchDashboardData = useCallback(() => {
    setIsLoading(false);
  }, []);

  const fetchDealRadar = useCallback(async () => {
    dealRadarFetchAbortRef.current?.abort();
    const controller = new AbortController();
    dealRadarFetchAbortRef.current = controller;
    const generation = ++dealRadarFetchGenerationRef.current;

    try {
      setDealRadarLoading(true);
      setDealRadarNextOffset(null);
      dealRadarNextOffsetRef.current = null;
      dealRadarLoadedOffsetsRef.current = new Set();

      const initialOffset = 0;
      const res = await dashboardApiService.getDealRadar({
        limit: DEAL_RADAR_PAGE_LIMIT,
        offset: initialOffset,
        signal: controller.signal,
      });
      if (generation !== dealRadarFetchGenerationRef.current) return;

      const mappedItems = res.items.map((item) =>
        mapDealRadarItem(item as unknown as Record<string, unknown>)
      );
      if (generation !== dealRadarFetchGenerationRef.current) return;

      setDealRadarItems(mappedItems);
      dealRadarLoadedOffsetsRef.current.add(initialOffset);
      const nextOffset = res.has_next_page ? res.next_offset : null;
      setDealRadarNextOffset(nextOffset);
      dealRadarNextOffsetRef.current = nextOffset;
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Error fetching Deal Radar:", error);
    } finally {
      if (generation === dealRadarFetchGenerationRef.current) {
        setDealRadarLoading(false);
      }
    }
  }, []);

  const isDealRadarNearBottom = useCallback((): boolean => {
    const scrollRoot = dealRadarScrollRef.current;
    if (!scrollRoot) return false;
    const distanceFromBottom =
      scrollRoot.scrollHeight -
      scrollRoot.scrollTop -
      scrollRoot.clientHeight;
    return distanceFromBottom <= DEAL_RADAR_SCROLL_THRESHOLD_PX;
  }, []);

  const loadMoreDealRadar = useCallback(async () => {
    const requestOffset = dealRadarNextOffsetRef.current;
    if (requestOffset == null || dealRadarLoadingMoreRef.current) {
      return;
    }

    if (dealRadarLoadedOffsetsRef.current.has(requestOffset)) {
      return;
    }

    dealRadarLoadingMoreRef.current = true;
    dealRadarLoadedOffsetsRef.current.add(requestOffset);
    setDealRadarLoadingMore(true);

    try {
      const res = await dashboardApiService.getDealRadar({
        limit: DEAL_RADAR_PAGE_LIMIT,
        offset: requestOffset,
      });

      const incoming = res.items.map((item) =>
        mapDealRadarItem(item as unknown as Record<string, unknown>)
      );
      setDealRadarItems((prev) =>
        appendDealRadarItems(prev, incoming)
      );
      const nextOffset = res.has_next_page ? res.next_offset : null;
      setDealRadarNextOffset(nextOffset);
      dealRadarNextOffsetRef.current = nextOffset;
    } catch (error) {
      console.error("Error loading more Deal Radar items:", error);
      dealRadarLoadedOffsetsRef.current.delete(requestOffset);
    } finally {
      dealRadarLoadingMoreRef.current = false;
      setDealRadarLoadingMore(false);
    }
  }, []);

  const tryLoadMoreDealRadarIfNearBottom = useCallback(() => {
    if (
      dealRadarLoading ||
      dealRadarNextOffsetRef.current == null ||
      dealRadarLoadingMoreRef.current
    ) {
      return;
    }
    if (isDealRadarNearBottom()) {
      void loadMoreDealRadar();
    }
  }, [dealRadarLoading, isDealRadarNearBottom, loadMoreDealRadar]);

  const scheduleDealRadarScrollCheck = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        tryLoadMoreDealRadarIfNearBottom();
      });
    });
  }, [tryLoadMoreDealRadarIfNearBottom]);

  const fetchCorporateEvents = useCallback(async () => {
    try {
      setCorporateEventsLoading(true);

      const eventsResponse = await dashboardApiService.getCorporateEvents({
        showFollowed: false,
        userId: null,
      });

      let eventsData: CorporateEvent[] = [];
      const responseValue = eventsResponse as unknown as Record<string, unknown>;

      if (responseValue.CorporateEvents) {
        eventsData = responseValue.CorporateEvents as CorporateEvent[];
      } else if (responseValue.data) {
        eventsData = responseValue.data as CorporateEvent[];
      } else if (Array.isArray(responseValue)) {
        eventsData = responseValue as CorporateEvent[];
      }

      setCorporateEvents(eventsData || []);
    } catch (error) {
      console.error("Error fetching corporate events:", error);
      if (
        error instanceof Error &&
        error.message === "Authentication required"
      ) {
        return;
      }
      setCorporateEvents([]);
    } finally {
      setCorporateEventsLoading(false);
    }
  }, []);

  const fetchInsightsArticles = useCallback(async () => {
    try {
      setInsightsArticlesLoading(true);

      const [insightsResponse, newsResponse] = await Promise.all([
        dashboardApiService.getAllContentArticlesHome(),
        dashboardApiService.getHomeNewsArticles(16),
      ]);

      const newsSorted = (newsResponse.items as unknown as InsightArticle[]).sort(
        (a, b) =>
          Date.parse(b.Publication_Date || "0") -
          Date.parse(a.Publication_Date || "0")
      );
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const newsThisWeek = newsSorted.filter((article) => {
        const t = Date.parse(article.Publication_Date || "");
        return !Number.isNaN(t) && t >= Date.now() - weekMs;
      });
      setHomeNewsArticles(
        (newsThisWeek.length >= 4 ? newsThisWeek : newsSorted).slice(0, 4)
      );

      let insightsData: InsightArticle[] = [];
      if (Array.isArray(insightsResponse)) {
        insightsData = insightsResponse as InsightArticle[];
      } else if (insightsResponse && typeof insightsResponse === "object") {
        const wrapped = insightsResponse as Record<string, unknown>;
        if (Array.isArray(wrapped.data)) {
          insightsData = wrapped.data as InsightArticle[];
        } else if (Array.isArray(wrapped.items)) {
          insightsData = wrapped.items as InsightArticle[];
        }
      }

      setInsightsArticles(insightsData || []);
    } catch (error) {
      console.error("Error fetching insights articles:", error);
      if (
        error instanceof Error &&
        error.message === "Authentication required"
      ) {
        return;
      }
      setInsightsArticles([]);
      setHomeNewsArticles([]);
    } finally {
      setInsightsArticlesLoading(false);
    }
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    console.log("Dashboard page - authLoading:", authLoading);
    console.log("Dashboard page - isAuthenticated:", isAuthenticated);

    // Wait for auth context to finish loading
    if (authLoading) {
      console.log("Dashboard page - Still loading auth, waiting...");
      return;
    }

    if (!isAuthenticated) {
      // AuthRouteGuard will show the login modal — no redirect needed
      return;
    }

    console.log("Dashboard page - Authenticated, fetching data");
    // Only fetch data if we're authenticated
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, isAuthenticated, authLoading]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchDealRadar();
  }, [authLoading, isAuthenticated, fetchDealRadar]);

  // All 3 columns fill the same CSS-grid row (bounded by the flex-1 min-h-0
  // row inside the h-screen shell) and scroll their own content internally —
  // no JS height measurement needed now that the shell itself is fixed-height.
  useEffect(() => {
    const scrollRoot = dealRadarScrollRef.current;
    if (!scrollRoot || dealRadarLoading) {
      return;
    }

    const onScroll = () => {
      tryLoadMoreDealRadarIfNearBottom();
    };

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    scheduleDealRadarScrollCheck();

    return () => scrollRoot.removeEventListener("scroll", onScroll);
  }, [
    dealRadarLoading,
    dealRadarLoadingMore,
    dealRadarNextOffset,
    scheduleDealRadarScrollCheck,
    tryLoadMoreDealRadarIfNearBottom,
  ]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCorporateEvents();
  }, [authLoading, isAuthenticated, fetchCorporateEvents]);

  // Sector name -> id maps for linking Corporate Events sector text.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const [primaries, secondaries] = await Promise.all([
          locationsService.getPrimarySectors(),
          locationsService.getAllSecondarySectorsWithPrimary(),
        ]);
        if (cancelled) return;
        const primaryMap: Record<string, number> = {};
        for (const p of primaries) {
          if (p?.sector_name && typeof p.id === "number") {
            primaryMap[normalizeSectorName(p.sector_name)] = p.id;
          }
        }
        setPrimarySectorNameToId(primaryMap);
        const secondaryMap: Record<string, number> = {};
        for (const s of secondaries) {
          if (s?.sector_name && typeof s.id === "number") {
            secondaryMap[normalizeSectorName(s.sector_name)] = s.id;
          }
        }
        setSecondarySectorNameToId(secondaryMap);
      } catch {
        // Leave maps empty — sector text still renders, just without links.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchInsightsArticles();
  }, [authLoading, isAuthenticated, fetchInsightsArticles]);


  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render the dashboard
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isTrialActive) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (
      anchor &&
      anchor.getAttribute("href") &&
      anchor.getAttribute("href") !== "#"
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppLeftNav />
      {/* `.dash` sets its own font-family/background — scoped to this content
          column only, so it can't leak into the shared sidebar. */}
      <div className="dash flex-1 min-w-0 h-full overflow-hidden">
      {/* Main Content */}
      <main
        className="h-full flex flex-col px-2 pt-14 pb-4 mx-auto w-full sm:px-4 md:pt-8 md:pb-8"
        style={{ position: "relative" }}
        onClickCapture={handleClickCapture}
      >
        {isTrialActive && (
          <div className="shrink-0 px-4 py-3 mb-4 text-yellow-900 bg-yellow-50 rounded-lg border border-yellow-300 sm:mb-6">
            <div className="font-semibold">Trial access</div>
            <div className="text-sm">
              You have limited navigation.{" "}
              {typeof trialDaysLeft === "number" && trialDaysLeft >= 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
                : "Expires soon"}
              .
            </div>
          </div>
        )}
        {/* Dashboard Subheader */}
        <div className="dash-searchrow shrink-0 flex items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 w-full">
          <GlobalSearchBar />
          <div className="flex shrink-0 items-center gap-2 ml-auto sm:gap-3">
            <NewFeatureCallout
              featureKey="dashboard-request-data-research"
              launchedAt="2026-05-26T00:00:00.000Z"
              durationDays={30}
              persistDismissal
              side="left"
            >
              <RequestDataResearchButton
                label="Request Data and Research"
                context="dashboard"
                sourcePage="Dashboard"
              />
            </NewFeatureCallout>
          </div>
        </div>

        {!isTrialActive && (
          <div className="dash-card shrink-0 mb-4 sm:mb-6 overflow-hidden">
            <div className="dash-card-header flex flex-wrap items-center gap-3 p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="dash-card-icon flex items-center justify-center w-7 h-7 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                    <path d="M18 14h-8" />
                    <path d="M15 18h-5" />
                    <path d="M10 6h8v4h-8V6Z" />
                  </svg>
                </span>
                <span className="dash-card-title">News</span>
              </div>
              <a href="/insights-analysis?content_type=News" className="dash-view-all ml-auto px-3 py-1.5 text-xs whitespace-nowrap">
                View all
              </a>
            </div>
            {insightsArticlesLoading ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">Loading news...</p>
              </div>
            ) : homeNewsArticles.length > 0 ? (
              <div className="dash-news-lane">
                {homeNewsArticles.map((article) => {
                  const href = `/article/${article.id}?from=home`;
                  const newsSubType = getNewsSubType(article);
                  return (
                    <a key={article.id} href={href} className="dash-news-item">
                      <span className="dash-news-item-meta">
                        {newsSubType ? (
                          <span className={dashNewsSubtypeTagClass(newsSubType)}>
                            <i aria-hidden="true" />
                            {newsSubType}
                          </span>
                        ) : null}
                        {article.Publication_Date && (
                          <span className="dt">
                            {formatDate(article.Publication_Date)}
                          </span>
                        )}
                      </span>
                      <span className="h">{article.Headline}</span>
                      {article.Strapline && (
                        <span className="d">{article.Strapline}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">No news to show</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 flex-1 min-h-0">
          {/* Deal Radar - last on mobile, last on lg+ */}
          <div
            className="dash-card dash-triplet-card grid grid-rows-[auto_1fr] overflow-hidden min-h-0 order-3 lg:order-3"
          >
            <div className="dash-card-header shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="dash-card-icon flex items-center justify-center w-7 h-7 shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 7.76a6 6 0 0 0 0 8.49" />
                    <path d="M20.49 3.51a12 12 0 0 1 0 16.97M3.51 3.51a12 12 0 0 0 0 16.97" />
                  </svg>
                </span>
                <NewFeatureCallout
                  featureKey="dashboard-deal-radar"
                  launchedAt="2026-05-26T00:00:00.000Z"
                  durationDays={30}
                  persistDismissal
                  side="right"
                >
                  <a href={buildDealRadarCompaniesViewAllHref()} className="dash-card-title">
                    Deal Radar
                  </a>
                </NewFeatureCallout>
              </div>
              <a
                href={buildDealRadarCompaniesViewAllHref()}
                className="dash-view-all hidden sm:inline-flex px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                View all
              </a>
            </div>
            <div
              ref={dealRadarScrollRef}
              className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden"
            >
              {dealRadarLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={i} className="grid grid-cols-3 gap-3 py-2 animate-pulse">
                      <div className="space-y-1.5 col-span-1">
                        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="h-3.5 bg-gray-200 rounded col-span-1" />
                      <div className="h-5 bg-gray-200 rounded-full col-span-1 w-20" />
                    </div>
                  ))}
                </div>
              ) : dealRadarItems.length > 0 ? (
                <div className="min-w-0 w-full">
                    <table className="dash-table w-full table-fixed">
                      <colgroup>
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "34%" }} />
                        <col style={{ width: "36%" }} />
                      </colgroup>
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="text-left">
                            Company
                          </th>
                          <th className="text-center">
                            Sector
                          </th>
                          <th className="text-center">
                            <span className="inline-flex items-center gap-1.5">
                              Stage
                              <DealStageInfoTooltip />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {dealRadarItems.map((item) => {
                          return (
                            <tr
                              key={item.companyId}
                              className="align-top"
                            >
                              <td className="pl-3 pr-1 py-3 min-w-0 align-top">
                                <div className="space-y-1 min-w-0">
                                  <div className="min-w-0">
                                    <a
                                      href={`/company/${item.companyId}`}
                                      className="dash-company-link break-words hover:underline"
                                      onClick={(
                                        e: React.MouseEvent<HTMLAnchorElement>
                                      ) => {
                                        if (
                                          e.defaultPrevented ||
                                          e.button !== 0 ||
                                          e.metaKey ||
                                          e.ctrlKey ||
                                          e.shiftKey ||
                                          e.altKey
                                        ) {
                                          return;
                                        }
                                        e.preventDefault();
                                        router.push(`/company/${item.companyId}`);
                                      }}
                                    >
                                      {item.companyName}
                                      <CountryFlagImg iso2={item.hqCountryIso2} />
                                    </a>
                                  </div>
                                  {item.contentCta && (
                                    <a
                                      href={`/article/${item.contentCta.id}?from=home`}
                                      className="dash-rr"
                                      onClick={(
                                        e: React.MouseEvent<HTMLAnchorElement>
                                      ) => {
                                        if (
                                          e.defaultPrevented ||
                                          e.button !== 0 ||
                                          e.metaKey ||
                                          e.ctrlKey ||
                                          e.shiftKey ||
                                          e.altKey
                                        ) {
                                          return;
                                        }
                                        e.preventDefault();
                                        router.push(
                                          `/article/${item.contentCta!.id}?from=home`
                                        );
                                      }}
                                    >
                                      {getDealRadarContentCtaLabel(item.contentCta)}
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="pl-3 pr-2 py-3 min-w-0 text-xs text-gray-700 align-top text-center">
                                {item.primarySectors.length > 0 ? (
                                  <CappedMultiValueLinks
                                    layout="stack"
                                    items={item.primarySectors.map((sector, idx) => ({
                                      key: `${sector.id}-${sector.name}-${idx}`,
                                      name: sector.name,
                                      href:
                                        sector.id > 0
                                          ? `/sector/${sector.id}`
                                          : undefined,
                                    }))}
                                    linkClassName="text-blue-700 hover:text-blue-900 hover:underline text-xs"
                                    overflowClassName="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold px-1.5 py-0.5 cursor-pointer border-0"
                                    showLessClassName="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer border-0 bg-transparent p-0 mt-0.5"
                                    onLinkClick={(e) => {
                                      const href = e.currentTarget.getAttribute("href");
                                      if (href) void router.push(href);
                                    }}
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-2 py-3 text-center align-top">
                                <TransactionStatusPill
                                  status={item.transactionStatus}
                                  className="inline-block max-w-[11rem]"
                                  allowWrap
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {dealRadarLoadingMore && (
                      <div className="flex justify-center px-4 py-3 border-t border-gray-100">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg
                            className="w-3 h-3 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          Loading more…
                        </span>
                      </div>
                    )}
                </div>
              ) : (
                <div className="p-4 py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">No active transactions</p>
                </div>
              )}
            </div>
          </div>

          {/* Insights & Analysis - first on mobile */}
          <div
            className="dash-card dash-triplet-card grid grid-rows-[auto_1fr] overflow-hidden min-h-0 order-1 lg:order-2"
          >
            <div className="dash-card-header shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="dash-card-icon flex items-center justify-center w-7 h-7 shrink-0">
                  <LightBulbIcon className="w-4 h-4" aria-hidden="true" />
                </span>
                <a href="/insights-analysis" className="dash-card-title">
                  Insights &amp; Analysis
                </a>
              </div>
              <a
                href="/insights-analysis"
                className="dash-view-all hidden sm:inline-flex px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                View all
              </a>
            </div>
            <div className="min-h-0 min-w-0 overflow-y-auto">
              <div className="dash-card-subhead" aria-hidden="true" />
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3 sm:pt-4 lg:pt-0">
              {insightsArticlesLoading ? (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">
                    Loading insights articles...
                  </p>
                </div>
              ) : insightsArticles.length > 0 ? (
                <div className="space-y-4">
                  {insightsArticles.slice(0, 10).map((article) => {
                    if (isNewsArticle(article)) {
                      return (
                        <NewsArticleCard
                          key={article.id}
                          article={article as unknown as ContentArticle}
                        />
                      );
                    }

                    const ct = (
                      article.Content_Type ||
                      article.content_type ||
                      article.Content?.Content_type ||
                      article.Content?.Content_Type ||
                      ""
                    ).trim();
                    const href = `/article/${article.id}?from=home`;
                    const hqCountryIso2 = getInsightHqCountryIso2(article);

                    return (
                      <div key={article.id} className="dash-art overflow-hidden">
                        <div
                          className="h-[3px] shrink-0"
                          style={{
                            backgroundColor: getContentTypeAccentColor(ct),
                          }}
                        />
                        <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span style={getContentTypeBadgeStyle(ct)}>
                            {ct || "Insight"}
                          </span>
                          <span className="dash-ev-meta shrink-0">
                            {formatDate(article.Publication_Date)}
                          </span>
                        </div>

                        <div className="mt-3 min-w-0">
                          <a
                            href={href}
                            className="dash-art-title break-words hover:underline"
                            onClick={(e) => {
                              if (
                                e.defaultPrevented ||
                                e.button !== 0 ||
                                e.metaKey ||
                                e.ctrlKey ||
                                e.shiftKey ||
                                e.altKey
                              )
                                return;
                              e.preventDefault();
                              router.push(href);
                            }}
                          >
                            {article.Headline}
                            <CountryFlagImg iso2={hqCountryIso2} />
                          </a>
                        </div>

                        {(() => {
                          const ts = getInsightTransactionStatus(article);
                          return ts ? (
                            <div className="mt-2">
                              <TransactionStatusPill status={ts} />
                            </div>
                          ) : null;
                        })()}

                        {article.Strapline ? (
                          <p className="dash-art-p mt-2 line-clamp-3">
                            {article.Strapline}
                          </p>
                        ) : null}

                        <a
                          href={href}
                          className="go inline-flex items-center gap-1 mt-3"
                          onClick={(e) => {
                            if (
                              e.defaultPrevented ||
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            router.push(href);
                          }}
                        >
                          Read full article <span aria-hidden="true">→</span>
                        </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">No insights available</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Corporate Events - second on mobile, first on lg+ */}
          <div
            className="dash-card dash-triplet-card grid grid-rows-[auto_1fr] overflow-hidden min-h-0 order-2 lg:order-1"
          >
            <div className="dash-card-header shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="dash-card-icon flex items-center justify-center w-7 h-7 shrink-0">
                  <CalendarDaysIcon className="w-4 h-4" aria-hidden="true" />
                </span>
                <a href="/corporate-events" className="dash-card-title">
                  Corporate Events
                </a>
              </div>
              <a
                href="/corporate-events"
                className="dash-view-all hidden sm:inline-flex px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                View all
              </a>
            </div>
            <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-auto">
              {corporateEventsLoading ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Loading corporate events...
                  </p>
                </div>
              ) : corporateEvents.length > 0 ? (
                <div className="min-w-full">
                  {/* Mobile view - cards */}
                  <div className="block lg:hidden">
                    <div className="p-3 space-y-3">
                      {corporateEvents.slice(0, 10).map((event, idx) => (
                        <div
                          key={getCorporateEventId(event) ?? `ev-card-${idx}`}
                          className="p-3 space-y-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            {(() => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const eid = getCorporateEventId(event as any);
                              const desc = event.description;
                              const safeHref = eid
                                ? `/corporate-event/${eid}`
                                : desc
                                ? `/corporate-events?search=${encodeURIComponent(
                                    desc
                                  )}`
                                : "#";
                              return (
                                <a
                                  href={safeHref}
                                  className="dash-ev-title flex-1 break-words"
                                  onClick={(e) => {
                                    if (
                                      e.defaultPrevented ||
                                      e.button !== 0 ||
                                      e.metaKey ||
                                      e.ctrlKey ||
                                      e.shiftKey ||
                                      e.altKey
                                    ) {
                                      return;
                                    }
                                    e.preventDefault();
                                    handleCorporateEventClick(eid, desc);
                                  }}
                                >
                                  {event.description}
                                </a>
                              );
                            })()}
                          </div>
                          <div className="dash-ev-meta">
                            {(() => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const ev: any = event as any;
                              return formatDate(ev.date || event.announcement_date);
                            })()}
                          </div>
                          <div className="space-y-1 dash-ev-kv">
                            <div>
                              <strong>Target:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const isPartnership =
                                  (ev.deal_type || "")
                                    .toLowerCase()
                                    .trim() === "partnership";

                                const targetsArr =
                                  parseEntityArray<EntityRef>(ev.targets);

                                const targetObj = (safeParseJson<EntityRef>(
                                  ev.target
                                ) ||
                                  (typeof ev.target === "object"
                                    ? (ev.target as Record<string, unknown>)
                                    : null)) as EntityRef | null;
                                const targetLegacyName =
                                  event.Target_Counterparty?.new_company?.name;

                                const displayTargets =
                                  targetsArr.length > 0
                                    ? isPartnership
                                      ? dedupeById(targetsArr)
                                      : dedupeById(targetsArr).slice(0, 1)
                                    : [];

                                const targetName =
                                  targetObj?.name || targetLegacyName;

                                if (displayTargets.length > 0) {
                                  return renderCappedEntityLinks(
                                    displayTargets,
                                    "m-tgt"
                                  );
                                } else if (targetName) {
                                  return targetObj ? (
                                    renderTargetEntityInline(targetObj, {
                                      stackFlag: false,
                                    })
                                  ) : (
                                    <span>{targetName}</span>
                                  );
                                }
                                return <span>Not Available</span>;
                              })()}
                            </div>
                            <div>
                              <strong>Seller(s):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sellersNew = parseEntityArray<EntityRef>(
                                  ev.sales
                                );

                                if (sellersNew.length === 0) {
                                  return <span>Not Available</span>;
                                }

                                return renderCappedEntityLinks(
                                  sellersNew,
                                  "m-seller"
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Type:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Type?: string;
                                  Funding_Stage?: string;
                                  Amount?: string;
                                  Investment_Amount?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  };
                                  Enterprise_Value?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  } | null;
                                }>(ev.deal_details);

                                const dealType =
                                  details?.Type || ev.deal_type || ev.type;
                                return dealType || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>Deal Stage:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Funding_Stage?: string;
                                }>(ev.deal_details);

                                const fundingStage = (
                                  (details?.Funding_Stage ||
                                    (event as {
                                      investment_data?: {
                                        Funding_stage?: string;
                                        funding_stage?: string;
                                      };
                                    }).investment_data?.Funding_stage ||
                                    (event as {
                                      investment_data?: {
                                        Funding_stage?: string;
                                        funding_stage?: string;
                                      };
                                    }).investment_data?.funding_stage ||
                                    "") as string
                                ).trim();

                                if (!fundingStage) return "Not Available";
                                return (
                                  <span className="inline-block px-2 py-0.5 ml-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                    {fundingStage}
                                  </span>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Amount (m):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Amount?: string;
                                  Investment_Amount?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  };
                                }>(ev.deal_details);

                                const rawAmount = (details?.Amount || "")
                                  .toString()
                                  .trim();
                                const cleanedAmount = rawAmount.replace(
                                  /^amount:\s*/i,
                                  ""
                                );
                                const formatAmountString = (
                                  value: string
                                ): string => {
                                  const v = (value || "").trim();
                                  if (!v) return "";
                                  const m1 = v.match(
                                    /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                                  );
                                  if (m1)
                                    return `${m1[1].toUpperCase()}${m1[2]}`;
                                  const m2 = v.match(
                                    /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                                  );
                                  if (m2)
                                    return `${m2[2].toUpperCase()}${m2[1]}`;
                                  const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i);
                                  if (m3)
                                    return `${m3[1].toUpperCase()}${m3[2]}`;
                                  return v;
                                };

                                const formatAmountObject = (opts?: {
                                  value?: number;
                                  currency?: string;
                                  formatted?: string;
                                }): string => {
                                  if (!opts) return "";
                                  const { value, currency, formatted } = opts;
                                  if (formatted && formatted.trim()) {
                                    return formatted.trim();
                                  }
                                  if (
                                    typeof value === "number" &&
                                    typeof currency === "string" &&
                                    currency.trim()
                                  ) {
                                    return `${currency.trim().toUpperCase()}${value}`;
                                  }
                                  return "";
                                };

                                const amountFromDetailsObject =
                                  formatAmountObject(details?.Investment_Amount);
                                const amountFromDetailsString =
                                  formatAmountString(cleanedAmount);

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const amountRaw = (event as any)?.amount;
                                const parsed = safeParseJson<{
                                  formatted?: string;
                                  currency?: string;
                                  value?: string | number;
                                }>(amountRaw);
                                const fromNew =
                                  parsed?.formatted ||
                                  (parsed?.currency &&
                                  parsed.value !== undefined &&
                                  parsed.value !== null
                                    ? `${String(parsed.value)} ${String(
                                        parsed.currency
                                      )}`
                                    : "");

                                const amount =
                                  amountFromDetailsObject ||
                                  amountFromDetailsString ||
                                  fromNew ||
                                  (event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                    ? `${event.investment_data.currrency.Currency} ${event.investment_data.investment_amount_m}m`
                                    : "");

                                return amount || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>EV (m):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Enterprise_Value?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  } | null;
                                }>(ev.deal_details);

                                const formatAmountObject = (opts?: {
                                  value?: number;
                                  currency?: string;
                                  formatted?: string;
                                }): string => {
                                  if (!opts) return "";
                                  const { value, currency, formatted } = opts;
                                  if (formatted && formatted.trim()) {
                                    return formatted.trim();
                                  }
                                  if (
                                    typeof value === "number" &&
                                    typeof currency === "string" &&
                                    currency.trim()
                                  ) {
                                    return `${currency.trim().toUpperCase()}${value}`;
                                  }
                                  return "";
                                };

                                const valuationFromDetails =
                                  formatAmountObject(
                                    details?.Enterprise_Value ?? undefined
                                  );
                                const valuationFallback =
                                  event.ev_data?.enterprise_value_m &&
                                  event.ev_data?.Currency
                                    ? `${event.ev_data.Currency} ${event.ev_data.enterprise_value_m}m`
                                    : "";
                                const valuation =
                                  valuationFromDetails || valuationFallback;

                                return valuation || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>Primary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sectors = safeParseJson<{
                                  Primary?: string[];
                                  Secondary?: string[];
                                }>(ev.sectors);

                                const primaryNewArr = Array.isArray(sectors?.Primary)
                                  ? (sectors!.Primary as string[]).filter(Boolean)
                                  : [];

                                const primaryRefs = parseSectorRefs(ev.primary);

                                const primaryFromNew = primaryNewArr.join(", ");

                                const primary =
                                  primaryFromNew ||
                                  (primaryRefs.length > 0
                                    ? primaryRefs.map((s) => s.name).join(", ")
                                    : "") ||
                                  getEventPrimarySectors(event);

                                if (!primary || primary === "Not Available") {
                                  return "Not Available";
                                }

                                return primaryRefs.length > 0 ? (
                                  <>
                                    {primaryRefs.map((s, idx, arr) => (
                                      <span key={`m-primary-${s.id}`}>
                                        <a
                                          href={`/sector/${s.id}`}
                                          className="dash-ev-link"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {idx < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {primary.split(",").map((name, idx, arr) => {
                                      const trimmed = name.trim();
                                      const sectorId =
                                        primarySectorNameToId[
                                          normalizeSectorName(trimmed)
                                        ];
                                      return (
                                        <span key={`m-primary-str-${idx}`}>
                                          {sectorId ? (
                                            <a
                                              href={`/sector/${sectorId}`}
                                              className="dash-ev-link"
                                              style={{ fontWeight: "500" }}
                                            >
                                              {trimmed}
                                            </a>
                                          ) : (
                                            trimmed
                                          )}
                                          {idx < arr.length - 1 && ", "}
                                        </span>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Secondary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sectors = safeParseJson<{
                                  Primary?: string[];
                                  Secondary?: string[];
                                }>(ev.sectors);

                                const secondaryNewArr = Array.isArray(sectors?.Secondary)
                                  ? (sectors!.Secondary as string[]).filter(Boolean)
                                  : [];

                                const secondaryRefs = parseSectorRefs(ev.secondary);

                                const secondaryFromNew = secondaryNewArr.slice(0, 3);

                                const list =
                                  event.Target_Counterparty?.new_company
                                    ?._sectors_objects?.sectors_id || [];
                                const secondaryLegacy = list
                                  .filter(
                                    (sector) =>
                                      sector &&
                                      sector.Sector_importance !== "Primary"
                                  )
                                  .map((sector) => sector.sector_name)
                                  .filter(Boolean)
                                  .slice(0, 3);
                                const secondary =
                                  secondaryFromNew.length > 0
                                    ? secondaryFromNew
                                    : secondaryRefs.length > 0
                                    ? secondaryRefs.slice(0, 3).map((s) => s.name)
                                    : secondaryLegacy;

                                if (secondary.length === 0) {
                                  return "Not Available";
                                }

                                return secondaryRefs.length > 0 ? (
                                  <>
                                    {secondaryRefs.slice(0, 3).map((s, idx, arr) => (
                                      <span key={`m-secondary-${s.id}`}>
                                        <a
                                          href={`/sub-sector/${s.id}`}
                                          className="dash-ev-link"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {idx < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {secondary.map((name, idx, arr) => {
                                      const sectorId =
                                        secondarySectorNameToId[
                                          normalizeSectorName(name)
                                        ];
                                      return (
                                        <span key={`m-secondary-str-${idx}`}>
                                          {sectorId ? (
                                            <a
                                              href={`/sub-sector/${sectorId}`}
                                              className="dash-ev-link"
                                              style={{ fontWeight: "500" }}
                                            >
                                              {name}
                                            </a>
                                          ) : (
                                            name
                                          )}
                                          {idx < arr.length - 1 && ", "}
                                        </span>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop view - table (scroll handled by parent column body) */}
                  <div className="hidden lg:block min-w-full">
                    <table className="dash-table w-full min-w-max table-fixed">
                      <colgroup>
                        <col style={leftNavOpen ? { width: "32%" } : undefined} />
                        <col style={{ width: leftNavOpen ? "36%" : "22%" }} />
                        <col style={leftNavOpen ? { width: "32%" } : undefined} />
                        {!leftNavOpen && <col />}
                      </colgroup>
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="text-left">
                            Event Details
                          </th>
                          <th className="text-left">
                            Parties
                          </th>
                          <th className="text-left">
                            Deal Details
                          </th>
                          {!leftNavOpen && (
                            <th className="text-left">
                              Sectors
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {corporateEvents.slice(0, 25).map((event, idx) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const eid = getCorporateEventId(event as any);
                          const desc = event.description;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const ev: any = event as any;

                          return (
                            <tr
                              key={eid ?? `ev-row-${idx}`}
                            >
                              <td className="px-4 py-4 max-w-xs">
                                <div className="mb-2">
                                  {(() => {
                                    const safeHref = eid
                                      ? `/corporate-event/${eid}`
                                      : desc
                                      ? `/corporate-events?search=${encodeURIComponent(
                                          desc
                                        )}`
                                      : "#";
                                    return (
                                      <a
                                        href={safeHref}
                                        className="dash-ev-title break-words"
                                        onClick={(e) => {
                                          if (
                                            e.defaultPrevented ||
                                            e.button !== 0 ||
                                            e.metaKey ||
                                            e.ctrlKey ||
                                            e.shiftKey ||
                                            e.altKey
                                          )
                                            return;
                                          e.preventDefault();
                                          handleCorporateEventClick(eid, desc);
                                        }}
                                      >
                                        {event.description}
                                      </a>
                                    );
                                  })()}
                                </div>
                                <div className="mb-1 dash-ev-meta">
                                  {formatDate(
                                    ev.date || event.announcement_date
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {/* Parties column */}
                                {(() => {
                                  const isPartnership =
                                    (ev.deal_type || "")
                                      .toLowerCase()
                                      .trim() === "partnership";

                                  const targetsArr =
                                    parseEntityArray<EntityRef>(ev.targets);

                                  const targetObj = (safeParseJson<EntityRef>(
                                    ev.target
                                  ) ||
                                    (typeof ev.target === "object"
                                      ? (ev.target as Record<string, unknown>)
                                      : null)) as EntityRef | null;
                                  const targetLegacyName =
                                    event.Target_Counterparty?.new_company?.name;

                                  const buyersArr = parseEntityArray<EntityRef>(
                                    (ev as { buyers?: unknown }).buyers
                                  );
                                  const investorsArr =
                                    parseEntityArray<EntityRef>(
                                      (ev as { investors?: unknown }).investors
                                    );
                                  const buyersInvestorsCombined =
                                    parseEntityArray<EntityRef>(
                                      (ev as { buyers_investors?: unknown })
                                        .buyers_investors
                                    );
                                  type LegacyCounterparty = {
                                    _new_company?: {
                                      name?: string;
                                      _is_that_investor?: boolean;
                                    };
                                    _counterparty_type?: {
                                      counterparty_status?: string;
                                    };
                                  };
                                  const legacyCounterparties: LegacyCounterparty[] =
                                    event.Other_Counterparties_of_Corporate_Event ||
                                    [];
                                  const legacyCombinedNames = legacyCounterparties
                                    .map((cp) => cp?._new_company?.name)
                                    .filter(Boolean) as string[];

                                  const sellersNew = parseEntityArray<EntityRef>(
                                    ev.sales
                                  );

                                  const advisors = (
                                    event.Advisors_of_Corporate_Event || []
                                  )
                                    .map((a) => a._new_company?.name)
                                    .filter(Boolean);

                                  const displayTargets =
                                    targetsArr.length > 0
                                      ? isPartnership
                                        ? dedupeById(targetsArr)
                                        : dedupeById(targetsArr).slice(0, 1)
                                      : [];

                                  const targetName =
                                    targetObj?.name || targetLegacyName;

                                  return (
                                    <div className="space-y-1">
                                      {displayTargets.length > 0 ? (
                                        <div className="dash-ev-kv">
                                          <strong>
                                            {isPartnership
                                              ? "Target(s):"
                                              : "Target:"}
                                          </strong>{" "}
                                          {renderCappedEntityLinks(
                                            displayTargets,
                                            "tgt"
                                          )}
                                        </div>
                                      ) : targetName ? (
                                        <div className="dash-ev-kv">
                                          <strong>
                                            {isPartnership
                                              ? "Target(s):"
                                              : "Target:"}
                                          </strong>{" "}
                                          {targetObj ? (
                                            renderTargetEntityInline(targetObj, {
                                      stackFlag: false,
                                    })
                                          ) : (
                                            <span>{targetName}</span>
                                          )}
                                        </div>
                                      ) : null}

                                      {buyersArr.length > 0 && (
                                        <div className="dash-ev-kv">
                                          <strong>Buyer(s):</strong>{" "}
                                          {renderCappedEntityLinks(
                                            buyersArr,
                                            "buyer"
                                          )}
                                        </div>
                                      )}

                                      {investorsArr.length > 0 && (
                                          <div className="dash-ev-kv">
                                            <strong>Investor(s):</strong>{" "}
                                            {renderCappedEntityLinks(
                                              investorsArr,
                                              "investor",
                                              { isInvestorHint: true }
                                            )}
                                          </div>
                                      )}

                                      {buyersArr.length === 0 &&
                                        investorsArr.length === 0 &&
                                        (buyersInvestorsCombined.length > 0 ||
                                          legacyCombinedNames.length > 0) && (
                                          <div className="dash-ev-kv">
                                            <strong>
                                              Buyer(s) / Investor(s):
                                            </strong>{" "}
                                            {buyersInvestorsCombined.length > 0
                                              ? renderCappedEntityLinks(
                                                  buyersInvestorsCombined,
                                                  "bi"
                                                )
                                              : renderCappedNameLinks(
                                                  legacyCombinedNames,
                                                  "legacy-bi"
                                                )}
                                          </div>
                                        )}

                                      {sellersNew.length > 0 && (
                                        <div className="dash-ev-kv">
                                          <strong>Seller(s):</strong>{" "}
                                          {renderCappedEntityLinks(
                                            sellersNew,
                                            "seller"
                                          )}
                                        </div>
                                      )}

                                      {advisors.length > 0 && (
                                        <div className="dash-ev-kv">
                                          <strong>Advisor(s):</strong>{" "}
                                          {renderCappedNameLinks(
                                            advisors.filter(Boolean) as string[],
                                            "advisor"
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-4">
                                {/* Deal Details column */}
                                {(() => {
                                  const details = safeParseJson<{
                                    Type?: string;
                                    Funding_Stage?: string;
                                    Amount?: string;
                                    Investment_Amount?: {
                                      value?: number;
                                      currency?: string;
                                      formatted?: string;
                                    };
                                    Enterprise_Value?: {
                                      value?: number;
                                      currency?: string;
                                      formatted?: string;
                                    } | null;
                                  }>(ev.deal_details);

                                  const dealType =
                                    details?.Type || event.deal_type;

                                  const fundingStage = (
                                    (details?.Funding_Stage ||
                                      (event as {
                                        investment_data?: {
                                          Funding_stage?: string;
                                          funding_stage?: string;
                                        };
                                      }).investment_data?.Funding_stage ||
                                      (event as {
                                        investment_data?: {
                                          Funding_stage?: string;
                                          funding_stage?: string;
                                        };
                                      }).investment_data?.funding_stage ||
                                      "") as string
                                  ).trim();

                                  const rawAmount = (details?.Amount || "")
                                    .toString()
                                    .trim();
                                  const cleanedAmount = rawAmount.replace(
                                    /^amount:\s*/i,
                                    ""
                                  );
                                  const formatAmountString = (
                                    value: string
                                  ): string => {
                                    const v = (value || "").trim();
                                    if (!v) return "";
                                    const m1 = v.match(
                                      /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                                    );
                                    if (m1)
                                      return `${m1[1].toUpperCase()}${m1[2]}`;
                                    const m2 = v.match(
                                      /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                                    );
                                    if (m2)
                                      return `${m2[2].toUpperCase()}${m2[1]}`;
                                    const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i);
                                    if (m3)
                                      return `${m3[1].toUpperCase()}${m3[2]}`;
                                    return v;
                                  };

                                  const formatAmountObject = (opts?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  }): string => {
                                    if (!opts) return "";
                                    const { value, currency, formatted } = opts;
                                    if (formatted && formatted.trim()) {
                                      return formatted.trim();
                                    }
                                    if (
                                      typeof value === "number" &&
                                      typeof currency === "string" &&
                                      currency.trim()
                                    ) {
                                      return `${currency.trim().toUpperCase()}${value}`;
                                    }
                                    return "";
                                  };

                                  const amountFromDetailsObject =
                                    formatAmountObject(details?.Investment_Amount);
                                  const amountFromDetailsString =
                                    formatAmountString(cleanedAmount);

                                  const amount =
                                    amountFromDetailsObject ||
                                    amountFromDetailsString ||
                                    (event.investment_data?.investment_amount_m &&
                                    event.investment_data?.currrency?.Currency
                                      ? `${String(
                                          event.investment_data.currrency.Currency
                                        )} ${String(
                                          event.investment_data
                                            .investment_amount_m
                                        )}m`
                                      : "");

                                  const valuationFromDetails =
                                    formatAmountObject(
                                      details?.Enterprise_Value ?? undefined
                                    );
                                  const valuationFallback =
                                    event.ev_data?.enterprise_value_m &&
                                    event.ev_data?.Currency
                                      ? `${event.ev_data.Currency} ${event.ev_data.enterprise_value_m}m`
                                      : "";
                                  const valuation =
                                    valuationFromDetails || valuationFallback;

                                  return (
                                    <div className="space-y-1.5">
                                      {dealType && (
                                        <div className="dash-ev-kv">
                                          <strong>Type</strong>{" "}
                                          <span className="dash-chip-neutral">
                                            {dealType}
                                          </span>
                                        </div>
                                      )}
                                      {fundingStage && (
                                        <div className="dash-ev-kv">
                                          <strong>Stage</strong>{" "}
                                          <span className="dash-chip-pos">
                                            {fundingStage}
                                          </span>
                                        </div>
                                      )}
                                      {amount && (
                                        <div className="dash-ev-kv">
                                          <strong>Amount (m)</strong>{" "}
                                          <span className="dash-ev-num">
                                            {amount}
                                          </span>
                                        </div>
                                      )}
                                      {valuation && (
                                        <div className="dash-ev-kv">
                                          <strong>EV (m)</strong>{" "}
                                          <span className="dash-ev-num">
                                            {valuation}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              {!leftNavOpen && (
                                <td className="px-4 py-4">
                                  {/* Sectors column */}
                                  {(() => {
                                    const sectors = safeParseJson<{
                                      Primary?: string[];
                                      Secondary?: string[];
                                    }>(ev.sectors);

                                    const primaryNewArr = Array.isArray(sectors?.Primary)
                                      ? (sectors!.Primary as string[]).filter(Boolean)
                                      : [];
                                    const secondaryNewArr = Array.isArray(sectors?.Secondary)
                                      ? (sectors!.Secondary as string[]).filter(Boolean)
                                      : [];

                                    const primaryRefs = parseSectorRefs(ev.primary);
                                    const secondaryRefs = parseSectorRefs(ev.secondary);

                                    const primaryFromNew = primaryNewArr.join(", ");
                                    const secondaryFromNew = secondaryNewArr.slice(0, 3);

                                    const primary =
                                      primaryFromNew ||
                                      (primaryRefs.length > 0
                                        ? primaryRefs.map((s) => s.name).join(", ")
                                        : "") ||
                                      getEventPrimarySectors(event);
                                    const list =
                                      event.Target_Counterparty?.new_company
                                        ?._sectors_objects?.sectors_id || [];
                                    const secondaryLegacy = list
                                      .filter(
                                        (sector) =>
                                          sector &&
                                          sector.Sector_importance !== "Primary"
                                      )
                                      .map((sector) => sector.sector_name)
                                      .filter(Boolean)
                                      .slice(0, 3);
                                    const secondary =
                                      secondaryFromNew.length > 0
                                        ? secondaryFromNew
                                        : secondaryRefs.length > 0
                                        ? secondaryRefs.slice(0, 3).map((s) => s.name)
                                        : secondaryLegacy;
                                    return (
                                      <div className="space-y-1">
                                        {primary && primary !== "Not Available" && (
                                          <div className="dash-ev-kv">
                                            <strong>Primary:</strong>{" "}
                                            {primaryRefs.length > 0
                                              ? primaryRefs.map((s, idx, arr) => (
                                                  <span key={`primary-${s.id}`}>
                                                    <a
                                                      href={`/sector/${s.id}`}
                                                      className="dash-ev-link"
                                                    >
                                                      {s.name}
                                                    </a>
                                                    {idx < arr.length - 1 && ", "}
                                                  </span>
                                                ))
                                              : primary.split(",").map((name, idx, arr) => {
                                                  const trimmed = name.trim();
                                                  const sectorId =
                                                    primarySectorNameToId[
                                                      normalizeSectorName(trimmed)
                                                    ];
                                                  return (
                                                    <span key={`primary-${idx}`}>
                                                      {sectorId ? (
                                                        <a
                                                          href={`/sector/${sectorId}`}
                                                          className="dash-ev-link"
                                                        >
                                                          {trimmed}
                                                        </a>
                                                      ) : (
                                                        trimmed
                                                      )}
                                                      {idx < arr.length - 1 && ", "}
                                                    </span>
                                                  );
                                                })}
                                          </div>
                                        )}
                                        {secondary.length > 0 && (
                                          <div className="dash-ev-kv">
                                            <strong>Secondary:</strong>{" "}
                                            {secondaryRefs.length > 0
                                              ? secondaryRefs.slice(0, 3).map((s, idx, arr) => (
                                                  <span key={`secondary-${s.id}`}>
                                                    <a
                                                      href={`/sub-sector/${s.id}`}
                                                      className="dash-ev-link"
                                                    >
                                                      {s.name}
                                                    </a>
                                                    {idx < arr.length - 1 && ", "}
                                                  </span>
                                                ))
                                              : secondary.map((name, idx, arr) => {
                                                  const sectorId =
                                                    secondarySectorNameToId[
                                                      normalizeSectorName(name)
                                                    ];
                                                  return (
                                                    <span key={`secondary-${idx}`}>
                                                      {sectorId ? (
                                                        <a
                                                          href={`/sub-sector/${sectorId}`}
                                                          className="dash-ev-link"
                                                        >
                                                          {name}
                                                        </a>
                                                      ) : (
                                                        name
                                                      )}
                                                      {idx < arr.length - 1 && ", "}
                                                    </span>
                                                  );
                                                })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No corporate events available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

export default function HomeUserPage() {
  return (
    <NavOpenProvider>
      <HomeUserPageContent />
    </NavOpenProvider>
  );
}
