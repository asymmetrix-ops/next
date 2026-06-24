"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PlusIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { corporateEventsService } from "../../../lib/corporateEventsService";
import {
  CorporateEventDetailResponse,
  CorporateEventAdvisor,
  Target,
} from "../../../types/corporateEvents";
import { ContentArticle } from "@/types/insightsAnalysis";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import { LinkPanel, T } from "@/components/redesign/primitives";
import { CorporateEventOverviewCard } from "@/components/corporate-events/CorporateEventOverviewCard";
import { CorporateEventCounterpartiesPanel } from "@/components/corporate-events/CorporateEventCounterpartiesPanel";
import { CorporateEventAdvisorsPanel } from "@/components/corporate-events/CorporateEventAdvisorsPanel";
import {
  CorporateEventTransactionsPanel,
  type CorporateEventTransactionRow,
} from "@/components/corporate-events/CorporateEventTransactionsPanel";
import { CorporateEventInsightsPanel } from "@/components/corporate-events/CorporateEventInsightsPanel";

// Type-safe check for Data & Analytics company flag
const isDataAnalyticsCompany = (candidate: unknown): boolean => {
  if (!candidate || typeof candidate !== "object") return false;
  const obj = candidate as { _is_that_data_analytic_company?: unknown };
  return typeof obj._is_that_data_analytic_company === "boolean"
    ? obj._is_that_data_analytic_company
    : false;
};

// Helper function to process logo URLs
  const buildLogoSrc = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    const value = String(raw).trim();
    const compact = value.replace(/\s+/g, "");
    if (!value) return undefined;
    if (/^data:/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) {
      try {
        const u = new URL(value);
        const host = u.hostname.toLowerCase();
        if (host.endsWith("licdn.com") || host.endsWith("linkedin.com")) {
          return undefined;
        }
        return value;
      } catch {
        return undefined;
      }
    }
    if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
      return `data:image/jpeg;base64,${compact}`;
    }
    return undefined;
};

// Corporate Event Detail Component
const CorporateEventDetail = ({
  data,
}: {
  data: CorporateEventDetailResponse;
}) => {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  type FlatEventFields = {
    investment_amount_m?: string | number | null;
    investment_amount?: string | number | null;
    investment_currency?: string | null;
    enterprise_value_m?: string | number | null;
    enterprise_value_currency?: string | null;
    enterprise_value_source_type?: string | null;
  };
  const event =
    Array.isArray(data?.Event) && data.Event.length > 0
      ? data.Event[0]
      : undefined;
  const counterparties = React.useMemo(
    () =>
      Array.isArray(data?.Event_counterparties)
        ? data.Event_counterparties
        : [],
    [data?.Event_counterparties]
  );
  const subSectors = Array.isArray(data?.["Sub-sectors"])
    ? data["Sub-sectors"]
    : [];
  const advisors: CorporateEventAdvisor[] = Array.isArray(data?.Event_advisors)
    ? data.Event_advisors
    : [];

  const previousCorporateEventsRaw = Array.isArray(data?.Previous_Corporate_Events)
    ? data.Previous_Corporate_Events
    : [];

  // Fast lookup for counterparties by id
  const counterpartiesById = React.useMemo(() => {
    const map = new Map<number, (typeof counterparties)[number]>();
    for (const cp of counterparties) {
      if (cp && typeof cp.id === "number") map.set(cp.id, cp);
    }
    return map;
  }, [counterparties]);

  // Fallback logo cache for investor counterparties
  const [logoMap, setLogoMap] = useState<Record<number, string | undefined>>(
    {}
  );

  useEffect(() => {
    const ids = (Array.isArray(counterparties) ? counterparties : [])
      .filter((cp) => {
        const nc = cp?._new_company;
        const isInvestor = Boolean(nc?._is_that_investor);
        const hasLogo = Boolean(
          nc?._linkedin_data_of_new_company?.linkedin_logo ||
            nc?.linkedin_data?.linkedin_logo
        );
        return isInvestor && !hasLogo && typeof nc?.id === "number";
      })
      .map((cp) => cp._new_company.id);

    const uniqueIds = Array.from(new Set(ids)).filter((id) => !(id in logoMap));
    if (uniqueIds.length === 0) return;

    let cancelled = false;
    const fetchLogos = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        await Promise.all(
          uniqueIds.map(async (companyId) => {
            try {
              const resp = await fetch(
                `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${companyId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  credentials: "include",
                }
              );
              if (!resp.ok) return;
              const data = await resp.json();
              const b64Logo =
                data?.Company?._linkedin_data_of_new_company?.linkedin_logo ||
                data?._linkedin_data_of_new_company?.linkedin_logo ||
                data?.linkedin_data?.linkedin_logo ||
                data?.Company?.linkedin_data?.linkedin_logo;
              if (!cancelled && b64Logo) {
                setLogoMap((prev) => ({ ...prev, [companyId]: b64Logo }));
              }
            } catch {
              // ignore individual fetch errors
            }
          })
        );
      } catch {
        // ignore batch errors
      }
    };

    fetchLogos();
    return () => {
      cancelled = true;
    };
  }, [counterparties, logoMap]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Formats a "millions" number (already in millions) WITHOUT currency and WITHOUT the "m" suffix.
  const formatMillionsValue = (amount: string | number): string | undefined => {
    const raw = typeof amount === "number" ? String(amount) : amount;
    const n = Number(String(raw).replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n === 0) return undefined;
    return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
  };

  const getInvestmentCurrency = (): string | undefined => {
    const inv = event?.investment_data as
      | { _currency?: { Currency?: string }; currency?: { Currency?: string } }
      | undefined;
    const fromInvestment = inv?.currency?.Currency || inv?._currency?.Currency;
    const flatEvent = (event ?? {}) as FlatEventFields;
    const topLevelCurrency =
      flatEvent.investment_currency || flatEvent.enterprise_value_currency;
    return (
      fromInvestment ||
      topLevelCurrency ||
      event?.ev_data?._currency?.Currency ||
      undefined
    );
  };

  const getInvestmentAmount = (): string | undefined => {
    const nested = event?.investment_data?.investment_amount_m;
    if (nested) return nested;
    const flatEvent = (event ?? {}) as FlatEventFields;
    const top =
      flatEvent.investment_amount_m ?? flatEvent.investment_amount ?? undefined;
    if (typeof top === "number") return String(top);
    if (typeof top === "string" && top.trim().length > 0) return top.trim();
    return undefined;
  };

  const getEnterpriseValueSourceLabel = (): string | undefined => {
    const flatEvent = (event ?? {}) as FlatEventFields;
    const rawSourceType =
      flatEvent.enterprise_value_source_type ?? event?.ev_data?.EV_source_type;

    if (typeof rawSourceType !== "string") return undefined;

    const normalized = rawSourceType.trim().toLowerCase();
    if (normalized === "estimate") return "Estimate";
    if (normalized === "public") return "Public";
    if (normalized === "proprietary") return "Proprietary";
    return undefined;
  };

  const [eventArticles, setEventArticles] = useState<ContentArticle[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<CorporateEventTransactionRow[]>([]);
  const [relatedInsights, setRelatedInsights] = useState<
    Array<{ id?: number; tag?: string; date?: string; title: string; content: string }>
  >([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    const run = async () => {
      const startedAt = Date.now();
      try {
        const evId = event?.id;
        if (!evId) return;
        console.log("[Insights & Analysis] fetch start", {
          corporate_event_id: evId,
        });
        const qs = new URLSearchParams({ corporate_event_id: String(evId) });
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l:develop/content?${qs.toString()}`;
        console.log("[Insights & Analysis] GET URL", url);
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        console.log("[Insights & Analysis] fetch response", {
          status: res.status,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        console.log("[Insights & Analysis] fetch success", {
          count: Array.isArray(data) ? data.length : undefined,
          payload: data,
        });
        setEventArticles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("[Insights & Analysis] fetch error", error);
        setEventArticles([]);
      } finally {
        console.log("[Insights & Analysis] fetch finished", {
          ms: Date.now() - startedAt,
        });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);


  const sourceUrl = event?.investment_data?.investment_amount_source || event?.deal_terms_data?.deal_terms_source;

  const corporateEventId = typeof event?.id === "number" ? event.id : undefined;

  // Get primary sectors with IDs
  const primarySectors = (() => {
                    const existing = Array.isArray(data.Primary_sectors)
      ? data.Primary_sectors.map((s) => ({
          name: s.sector_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (s as any)?.id || (s as any)?.sector_id || undefined,
        }))
      : [];
                    const derived = Array.isArray(subSectors)
                      ? subSectors
                          .flatMap((s) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const anyS = s as any;
                            const single = anyS?.related_primary_sector;
                            const many = anyS?.related_primary_sectors;
                            if (Array.isArray(many)) {
                              return many
                                .map(
                  (x: { sector_name?: string; id?: number; sector_id?: number }) => ({
                    name: x?.sector_name || "",
                    id: x?.id || x?.sector_id || undefined,
                  })
                )
                .filter((v) => v.name && v.name.length > 0);
                            }
                            const name: unknown = single?.sector_name;
            const id: unknown = (single as { id?: number; sector_id?: number })?.id || 
                               (single as { id?: number; sector_id?: number })?.sector_id;
                            return typeof name === "string" && name.length > 0
              ? [{ name, id: typeof id === "number" ? id : undefined }]
                              : [];
                          })
          .filter((v) => v.name && v.name.length > 0)
      : [];
    // Deduplicate by name
    const seen = new Set<string>();
    const combined = [...existing, ...derived].filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
    return combined;
  })();

  // Get sub-sectors with IDs
  const subSectorsWithIds = subSectors.map((s) => ({
    name: s.sector_name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: (s as any)?.id || (s as any)?.sector_id || (s as any)?.sub_sector_id || undefined,
  }));

  const primarySectorId =
    primarySectors.find((s) => typeof s.id === "number")?.id ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((data.Primary_sectors?.[0] as any)?.id as number | undefined);

  const metricsData = {
    sectors: primarySectors.length > 0 ? primarySectors : undefined,
    subSectors: subSectorsWithIds.length > 0 ? subSectorsWithIds : undefined,
    dateAnnounced: event?.announcement_date
      ? formatDate(event.announcement_date)
      : undefined,
    dateClosed: event?.closed_date ? formatDate(event.closed_date) : undefined,
    dealType: event?.deal_type || undefined,
    dealStage: (() => {
      const fundingStage = event?.investment_data?.Funding_stage;
      if (fundingStage && typeof fundingStage === "string" && fundingStage.trim().length > 0) {
        return fundingStage.trim();
      }
      return undefined;
    })(),
    investmentAmount: (() => {
      const amount = getInvestmentAmount();
      if (!amount) return undefined;
      return formatMillionsValue(amount);
    })(),
    currency: getInvestmentCurrency(),
    enterpriseValue: (() => {
      const flatEvent = (event ?? {}) as FlatEventFields;
      const amountRaw =
        event?.ev_data?.enterprise_value_m ??
        flatEvent.enterprise_value_m ??
        "";
      // Check if the value is empty, null, or 0
      if (amountRaw === null || amountRaw === undefined || amountRaw === "" || amountRaw === 0 || amountRaw === "0") {
        return undefined;
      }
      const amount =
        typeof amountRaw === "number"
          ? String(amountRaw)
          : amountRaw;
      const formatted = formatMillionsValue(amount);
      return formatted || undefined;
    })(),
    enterpriseValueCurrency: (() => {
      const flatEvent = (event ?? {}) as FlatEventFields;
                        return (
        event?.ev_data?._currency?.Currency ||
        flatEvent.enterprise_value_currency ||
        undefined
      );
    })(),
    enterpriseValueSourceLabel: getEnterpriseValueSourceLabel(),
  };

  // Insights logic:
  // - Always show an "Insights & Analysis" section for any articles explicitly tagged to this corporate event
  //   via `Related_Corporate_Event`.
  // - Always show a "Related Insights & Analysis" section (fetched by matching primary sector), but
  //   NEVER duplicate articles already shown in the top section.
  const insightsForEventRaw = eventArticles
    .filter((article) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const relatedEvents = (article as any)?.Related_Corporate_Event || [];
      if (!Array.isArray(relatedEvents) || typeof corporateEventId !== "number") {
        return false;
      }
      // Handle both formats: array of numbers [3416] or array of objects [{id: 3416}]
      const hasThisEvent = relatedEvents.some((ev: number | { id?: number } | undefined) => {
        if (typeof ev === "number") {
          return ev === corporateEventId;
        }
        if (ev && typeof ev === "object" && "id" in ev) {
          return ev.id === corporateEventId;
        }
        return false;
      });
      return hasThisEvent;
    })
    .sort((a, b) => {
      const da = new Date(a.Publication_Date || 0).getTime();
      const db = new Date(b.Publication_Date || 0).getTime();
      return db - da;
    });

  const insightsForEvent = insightsForEventRaw.map((article) => ({
    id: article.id,
    tag: (article.Content_Type || "Article").trim() || "Article",
    date: article.Publication_Date
      ? new Date(article.Publication_Date).toLocaleDateString()
      : undefined,
    title: article.Headline || "Untitled",
    content: article.Strapline || "",
  }));

  // Memoize primary sector IDs string to prevent infinite loops
  const primarySectorIdsString = useMemo(() => {
    return primarySectors
      .map((s) => s.id)
      .filter((id): id is number => typeof id === "number")
      .sort((a, b) => a - b)
      .join(",");
  }, [primarySectors]);

  const counterpartiesData = counterparties.map((counterparty) => {
    const nc = counterparty._new_company;
    const isInvestor = Boolean(nc?._is_that_investor);
    const isDA = isDataAnalyticsCompany(nc);
    const href = isInvestor
      ? `/investors/${counterparty.new_company_counterparty}`
      : isDA
      ? `/company/${Number(nc?.id)}`
      : undefined;

    const rawLogo =
      nc?._linkedin_data_of_new_company?.linkedin_logo ||
      nc?.linkedin_data?.linkedin_logo ||
      logoMap[nc?.id];
    const logo = buildLogoSrc(rawLogo);

    const individuals =
      Array.isArray(counterparty.counterparty_individuals) &&
      counterparty.counterparty_individuals.length > 0
        ? counterparty.counterparty_individuals
            .filter((individual) => typeof individual.individuals_id === "number")
            .map((individual) => ({
              id: individual.individuals_id,
              name: individual.advisor_individuals,
            }))
        : [];

    return {
      id: counterparty.id,
      name: nc?.name ?? "-",
      role:
        counterparty._counterpartys_type?.counterparty_status ||
        counterparty._counterparty_type?.counterparty_status ||
        "-",
      logo,
      individuals,
      href,
    };
  });

  const advisorsData = advisors.map((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyA = a as any;
    const rawLogo =
      anyA?._new_company?._linkedin_data_of_new_company?.linkedin_logo ||
      anyA?._new_company?.linkedin_data?.linkedin_logo;
    const logo = buildLogoSrc(rawLogo);

    const advisedId: number | undefined = anyA?.counterparty_advised;
    const cp = advisedId ? counterpartiesById?.get?.(advisedId) : undefined;
    const nc = cp?._new_company;
    const isInvestor = Boolean(nc?._is_that_investor);
    const isDA = isDataAnalyticsCompany(nc);
    const advisedHref = isInvestor
      ? `/investors/${cp?.new_company_counterparty}`
      : isDA
      ? `/company/${Number(nc?.id)}`
      : undefined;

    const advisorList = Array.isArray(anyA?.individuals)
      ? (anyA.individuals as Array<{
          id: number;
          individuals_id?: number;
          advisor_individuals: string;
        }>)
      : undefined;

    const individuals =
      Array.isArray(advisorList) && advisorList.length > 0
        ? advisorList
            .filter((ind) => typeof ind.individuals_id === "number")
            .map((ind) => ({
              id: ind.individuals_id as number,
              name: ind.advisor_individuals,
            }))
        : [];

    return {
      id: a.id,
      name: a._new_company.name,
      logo,
      role: a._advisor_role?.counterparty_status || "Advisor",
      advisedName: nc?.name || undefined,
      advisedHref,
      individuals,
      href: `/advisor/${a._new_company.id}`,
    };
  });

  const previousCorporateEventsData: CorporateEventTransactionRow[] =
    previousCorporateEventsRaw
      .filter((e) => e && typeof e.id === "number")
      .map((e) => {
        const dealType = e.deal_type || undefined;
        const dateRaw = e.date || e.announcement_date || e.closed_date || undefined;

        const date = dateRaw ? formatDate(dateRaw) : undefined;

        // Target (new API: `target`, legacy fallback: infer from `counterparties` if possible)
        const legacyCounterparties = Array.isArray(e.counterparties)
          ? e.counterparties
          : [];
        const legacyTarget =
          legacyCounterparties.find((c) =>
            String(c?.counterparty_status || "").toLowerCase().includes("target")
          ) || legacyCounterparties[0];

        const targetCompanyId: number | undefined =
          typeof e.target?.company_id === "number"
            ? e.target.company_id
            : typeof legacyTarget?.company_id === "number"
              ? legacyTarget.company_id
              : undefined;
        const targetCompanyName: string | undefined =
          typeof e.target?.company_name === "string" && e.target.company_name
            ? e.target.company_name
            : typeof legacyTarget?.company_name === "string" && legacyTarget.company_name
              ? legacyTarget.company_name
              : undefined;

        const target =
          targetCompanyId && targetCompanyName ? (
            <a
              href={`/company/${targetCompanyId}`}
              className="text-blue-600 hover:underline"
            >
              {targetCompanyName}
            </a>
          ) : undefined;

        // Investors (new API: `investors`, legacy fallback: infer from `counterparties`)
        const investorsArr = Array.isArray(e.investors)
          ? e.investors
          : legacyCounterparties.filter((c) => {
              const status = String(c?.counterparty_status || "").toLowerCase();
              return status && !status.includes("target");
            });

        const investors =
          Array.isArray(investorsArr) && investorsArr.length > 0 ? (
            <>
              {investorsArr.map((inv, idx) => {
                const name = String(inv?.company_name || "");
                const id = inv?.company_id;
                const content =
                  typeof id === "number" && name ? (
                    <a
                      href={`/company/${id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {name}
                    </a>
                  ) : (
                    <span>{name || "-"}</span>
                  );
                return (
                  <span key={typeof id === "number" ? id : idx}>
                    {content}
                    {idx < investorsArr.length - 1 && ", "}
                  </span>
                );
              })}
            </>
          ) : undefined;

        return {
          id: e.id,
          title: e.description || "View event",
          date,
          dealType,
          target,
          investors,
        };
      })
      .sort((a, b) => b.id - a.id);

  // Fetch related transactions + related insights (by primary sector), once we know primary sector id.
  useEffect(() => {
    const run = async () => {
      try {
        if (!primarySectorId || typeof primarySectorId !== "number") return;

        // Related transactions in same primary sector, excluding current event id.
        // Fetch more to allow for "Load More" functionality
        const tx = await corporateEventsService.getCorporateEvents(1, 30, {
          primary_sectors_ids: [primarySectorId],
        });
        const items = Array.isArray(tx?.items) ? tx.items : [];
        const filtered = items
          .filter((e) => (typeof corporateEventId === "number" ? e?.id !== corporateEventId : true))
          .map((e) => {
            const investors = Array.isArray(e?.other_counterparties)
              ? (() => {
                  const investorCounterparties = e.other_counterparties
                    .filter((c) => {
                      const nc = c?._new_company;
                      return nc?.name && Boolean(nc?._is_that_investor);
                    })
                    .slice(0, 3);
                  
                  if (investorCounterparties.length === 0) {
                    return undefined;
                  }
                  
                  return (
                    <>
                      {investorCounterparties.map((c, idx) => {
                        const nc = c._new_company;
                        const investorName = nc?.name || "";
                        const investorId = c?.new_company_counterparty;
                        const investorsArray = investorCounterparties;
                        
                        if (investorId && typeof investorId === "number") {
                          return (
                            <span key={investorId || idx}>
                              <a
                                href={`/investors/${investorId}`}
                                className="text-blue-600 hover:underline"
                              >
                                {investorName}
                              </a>
                              {idx < investorsArray.length - 1 && ", "}
                      </span>
                            );
                          }
                          return (
                          <span key={idx}>
                            {investorName}
                            {idx < investorsArray.length - 1 && ", "}
                            </span>
                          );
                      })}
                    </>
                  );
                })()
                            : undefined;
            
            // Extract targets from the targets array
            const targets = Array.isArray(e?.targets) && e.targets.length > 0
              ? e.targets.map((target: Target, idx: number) => {
                  const targetName = target?.name || "";
                  const targetId = target?.id;
                  const targetPath = target?.path;
                  const targetsArray = e.targets || [];
                  
                  if (targetId && targetPath) {
                    return (
                      <span key={targetId || idx}>
                        <a
                          href={targetPath}
                          className="text-blue-600 hover:underline"
                        >
                          {targetName}
                        </a>
                        {idx < targetsArray.length - 1 && ", "}
                                </span>
                            );
                          }
                          return (
                    <span key={idx}>
                      {targetName}
                      {idx < targetsArray.length - 1 && ", "}
                      </span>
                          );
                })
              : e?.target_counterparty?.new_company?.name 
                ? (() => {
                    const targetName = e.target_counterparty.new_company.name;
                    const targetId = e.target_counterparty.new_company.id;
                    return targetId ? (
                      <a
                        href={`/company/${targetId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {targetName}
                      </a>
                    ) : targetName;
                  })()
                : undefined;
            
            return {
              id: e.id,
              title: e.description || "View event",
              date: e.announcement_date ? formatDate(e.announcement_date) : undefined,
              dealType: e.deal_type || undefined,
              target: targets,
              investors: investors || undefined,
            };
          });
        setRelatedTransactions(filtered);

        // Sector Insights & Analysis (by primary sector), excluding any already shown above.
        // Uses api:Z3F6JUiu/articles_based_on_sectors to fetch 5 most recent articles
        // whose Primary Sector(s) match the corporate event's primary sector(s)

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        if (!token) return;

        // Get all primary sector IDs
        const primarySectorIds = primarySectors
          .map((s) => s.id)
          .filter((id): id is number => typeof id === "number");

        if (primarySectorIds.length === 0) {
          setRelatedInsights([]);
          return;
        }

        // Compute IDs of articles already shown in "Insights & Analysis" section
        const eventArticleIds = new Set(
          eventArticles
            .filter((article) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const relatedEvents = (article as any)?.Related_Corporate_Event || [];
              if (!Array.isArray(relatedEvents) || typeof corporateEventId !== "number") {
                return false;
              }
              return relatedEvents.some((ev: number | { id?: number } | undefined) => {
                if (typeof ev === "number") {
                  return ev === corporateEventId;
                }
                if (ev && typeof ev === "object" && "id" in ev) {
                  return ev.id === corporateEventId;
                }
                return false;
              });
            })
            .map((a) => a?.id)
            .filter((id): id is number => typeof id === "number")
        );

        const params = new URLSearchParams();
        // Add primary_sectors_ids as array parameters
        primarySectorIds.forEach((id) => {
          params.append("primary_sectors_ids[]", String(id));
        });
        // Add corporate_events_id
        if (typeof corporateEventId === "number") {
          params.append("corporate_events_id", String(corporateEventId));
        }
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/articles_based_on_sectors?${params.toString()}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[Sector Insights] API error:", res.status, errorData);
          setRelatedInsights([]);
          return;
        }
        const json = (await res.json()) as ContentArticle[] | { items?: ContentArticle[] };
        // Handle both array response and object with items property
        const itemsIA = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
        const filteredIA = itemsIA.filter(
          (article) => !(typeof article?.id === "number" && eventArticleIds.has(article.id))
        );
        const mapped = filteredIA.slice(0, 5).map((article) => ({
          id: article.id,
          tag: (article.Content_Type || "Article").trim() || "Article",
          date: article.Publication_Date
            ? new Date(article.Publication_Date).toLocaleDateString()
            : undefined,
          title: article.Headline || "Untitled",
          content: article.Strapline || "",
        }));
        setRelatedInsights(mapped);
      } catch {
        // ignore
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primarySectorIdsString, corporateEventId, eventArticles.length]);

  const handleExportPdf = useCallback(async () => {
    if (!corporateEventId || typeof corporateEventId !== "number") {
      console.error("[PDF Export] Invalid corporate event ID");
      return;
    }

    setIsExportingPdf(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const endpoint = "https://asymmetrix-pdf-service.fly.dev/api/export-corporate-event-pdf";
      
      // Prepare the full data payload
      const payload = {
        Event: data?.Event || [],
        Event_counterparties: data?.Event_counterparties || [],
        Event_advisors: data?.Event_advisors || [],
        Primary_sectors: data?.Primary_sectors || [],
        "Sub-sectors": data?.["Sub-sectors"] || [],
        event_articles: eventArticles || [],
        related_transactions: relatedTransactions || [],
        related_insights: relatedInsights || [],
        xano_auth_token: token,
      };

      console.log("[PDF Export] POST", endpoint, {
        corporate_event_id: corporateEventId,
        event_count: payload.Event.length,
        articles_count: payload.event_articles.length,
        transactions_count: payload.related_transactions.length,
        insights_count: payload.related_insights.length,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`PDF export failed: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const eventTitle = (event?.description || "Corporate Event")
        .toString()
        .replace(/[\\/:*?"<>|]/g, " ")
        .slice(0, 180);
      a.download = `Asymmetrix - ${eventTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error("[PDF Export] Error:", error);
      alert("Failed to export PDF. Please try again later.");
    } finally {
      setIsExportingPdf(false);
    }
  }, [corporateEventId, event?.description, data, eventArticles, relatedTransactions, relatedInsights]);

  const eventTitle = event?.description || "Corporate Event";
  const eventDescription = event?.long_description || "";

  useEffect(() => {
    if (eventTitle && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${eventTitle}`;
    }
  }, [eventTitle]);

  const reportMailTo = `mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
    `Contribute Data - ${eventTitle}`
  )}&body=${encodeURIComponent(
    "Please share the data you'd like to contribute for this corporate event page."
  )}`;

  const hasCounterparties = counterpartiesData.length > 0;
  const hasAdvisors = advisorsData.length > 0;
  const hasPreviousEvents = previousCorporateEventsData.length > 0;
  const hasRelatedTransactions = relatedTransactions.length > 0;
  const hasEventInsights = insightsForEvent.length > 0;
  const hasSectorInsights = relatedInsights.length > 0;
  const hasInsights = hasEventInsights || hasSectorInsights;

  let gridRow = 2;
  const counterpartiesGridRow = hasCounterparties ? gridRow++ : 0;
  const advisorsGridRow = hasAdvisors ? gridRow++ : 0;
  const previousEventsGridRow = hasPreviousEvents ? gridRow++ : 0;
  const relatedTransactionsGridRow = hasRelatedTransactions ? gridRow++ : 0;

  const styles = {
    container: {
      backgroundColor: T.paper,
      fontFamily: T.sans,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      maxWidth: "100%",
      padding: "18px",
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
  };

  const wideColumnSpan = hasInsights ? "1 / span 2" : "1 / -1";

  const responsiveCss = `
    .corporate-event-detail-page { overflow-x: hidden; }
    .responsiveGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      max-width: 100%;
      align-items: stretch;
    }
    .responsiveGrid > * { min-width: 0; min-height: 0; }
    .ce-grid-overview { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .ce-grid-description { grid-column: 2 / span 2; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .ce-grid-counterparties { grid-column: ${wideColumnSpan}; grid-row: ${counterpartiesGridRow || "auto"}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .ce-grid-advisors { grid-column: ${wideColumnSpan}; grid-row: ${advisorsGridRow || "auto"}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .ce-grid-previous { grid-column: ${wideColumnSpan}; grid-row: ${previousEventsGridRow || "auto"}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .ce-grid-related { grid-column: ${wideColumnSpan}; grid-row: ${relatedTransactionsGridRow || "auto"}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .ce-grid-insights { grid-column: 3; grid-row: 2 / ${gridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; gap: 12px; }
    .ce-grid-counterparties > *,
    .ce-grid-advisors > *,
    .ce-grid-previous > *,
    .ce-grid-related > *,
    .ce-grid-insights > * {
      min-width: 0;
      max-width: 100%;
      width: 100%;
    }
    @media (max-width: 768px) {
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .ce-grid-overview,
      .ce-grid-description,
      .ce-grid-counterparties,
      .ce-grid-advisors,
      .ce-grid-previous,
      .ce-grid-related,
      .ce-grid-insights {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
      }
    }
  `;

  return (
    <div className="corporate-event-detail-page" style={styles.container}>
      <div style={{ backgroundColor: T.paper, borderBottom: `1px solid ${T.divider}`, padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "22px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: T.ink,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
                fontFamily: T.sans,
              }}
            >
              {eventTitle}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf || !corporateEventId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: isExportingPdf ? T.faint : "#475569",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: isExportingPdf || !corporateEventId ? "not-allowed" : "pointer",
              }}
            >
              <ArrowUpTrayIcon width={15} height={15} strokeWidth={2} aria-hidden />
              {isExportingPdf ? "Exporting…" : "Export PDF"}
            </button>
            <a
              href={reportMailTo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: T.emerald,
                borderRadius: 6,
                padding: "8px 14px",
                textDecoration: "none",
              }}
            >
              <PlusIcon width={15} height={15} strokeWidth={2} aria-hidden />
              Contribute Data
            </a>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={styles.maxWidth}>
          <style>{responsiveCss}</style>
          <div className="responsiveGrid">
            <div className="ce-grid-overview">
              <CorporateEventOverviewCard
                fillGridCell
                primarySectors={primarySectors}
                subSectors={subSectorsWithIds}
                dateAnnounced={metricsData.dateAnnounced}
                dateClosed={metricsData.dateClosed}
                dealType={metricsData.dealType}
                dealStage={metricsData.dealStage}
                investmentAmount={metricsData.investmentAmount}
                investmentCurrency={metricsData.currency}
                enterpriseValue={metricsData.enterpriseValue}
                enterpriseValueCurrency={metricsData.enterpriseValueCurrency}
                enterpriseValueSourceLabel={metricsData.enterpriseValueSourceLabel}
                sourceUrl={sourceUrl}
              />
            </div>

            <div
              className="ce-grid-description"
              ref={descriptionRef}
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignSelf: isDescriptionExpanded ? "start" : "stretch",
                overflow: isDescriptionExpanded ? "visible" : "hidden",
              }}
            >
              <DescriptionCard
                text={eventDescription}
                expanded={isDescriptionExpanded}
                onToggleExpand={() => setIsDescriptionExpanded((prev) => !prev)}
                contentRef={descriptionRef}
                fillGridCell
              />
            </div>

            {hasCounterparties ? (
              <div className="ce-grid-counterparties">
                <LinkPanel fillGridCell>
                  <CorporateEventCounterpartiesPanel counterparties={counterpartiesData} />
                </LinkPanel>
              </div>
            ) : null}

            {hasAdvisors ? (
              <div className="ce-grid-advisors">
                <LinkPanel fillGridCell>
                  <CorporateEventAdvisorsPanel advisors={advisorsData} />
                </LinkPanel>
              </div>
            ) : null}

            {hasPreviousEvents ? (
              <div className="ce-grid-previous">
                <LinkPanel fillGridCell>
                  <CorporateEventTransactionsPanel
                    title="Previous Corporate Events"
                    rows={previousCorporateEventsData}
                  />
                </LinkPanel>
              </div>
            ) : null}

            {hasRelatedTransactions ? (
              <div className="ce-grid-related">
                <LinkPanel fillGridCell>
                  <CorporateEventTransactionsPanel
                    title="Recent Sector Transactions"
                    rows={relatedTransactions}
                  />
                </LinkPanel>
              </div>
            ) : null}

            {hasInsights ? (
              <div className="ce-grid-insights">
                {hasEventInsights ? (
                  <CorporateEventInsightsPanel
                    title="Insights & Analysis"
                    insights={insightsForEvent}
                    fillGridCell
                  />
                ) : null}
                {hasSectorInsights ? (
                  <CorporateEventInsightsPanel
                    title="Sector Insights & Analysis"
                    insights={relatedInsights}
                    fillGridCell
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

// Main Page Component
const CorporateEventDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CorporateEventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const corporateEventId = params.id as string;

      if (!corporateEventId) {
        throw new Error("Corporate event ID is required");
      }

      const response = await corporateEventsService.getCorporateEvent(
        corporateEventId
      );
      setData(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";

      if (
        errorMessage === "Authentication required" ||
        errorMessage.includes("Authentication token not found")
      ) {
        router.push("/login");
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [fetchData, params.id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: T.muted,
          }}
        >
          Loading corporate event details…
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            padding: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center", color: T.down }}>{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            padding: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: T.muted,
          }}
        >
          Corporate event not found
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: T.paper,
        fontFamily: T.sans,
      }}
    >
      <Header />
      <CorporateEventDetail data={data} />
      <Footer />
    </div>
  );
};

export default CorporateEventDetailPage;
