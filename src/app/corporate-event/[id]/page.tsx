"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { corporateEventsService } from "../../../lib/corporateEventsService";
import {
  CorporateEventDetailResponse,
  CorporateEventAdvisor,
} from "../../../types/corporateEvents";
import { useRightClick } from "@/hooks/useRightClick";
import { ContentArticle } from "@/types/insightsAnalysis";
import TransactionHero from "@/components/transaction/TransactionHero";
import DealMetrics from "@/components/transaction/DealMetrics";
import InsightsSection from "@/components/transaction/InsightsSection";
import CounterpartiesSection from "@/components/transaction/CounterpartiesSection";
import AdvisorsSection from "@/components/transaction/AdvisorsSection";
import RelatedTransactionsSection from "@/components/transaction/RelatedTransactionsSection";
import { Button } from "@/components/ui/button";

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
  const { createClickableElement } = useRightClick();
  type FlatEventFields = {
    investment_amount_m?: string | number | null;
    investment_amount?: string | number | null;
    investment_currency?: string | null;
    enterprise_value_m?: string | number | null;
    enterprise_value_currency?: string | null;
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
                `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${companyId}`,
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
    if (!dateString) return "Not available";
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

  const [eventArticles, setEventArticles] = useState<ContentArticle[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<
    Array<{
      id: number;
      title: string;
      date?: string;
      dealType?: string;
      target?: string | React.ReactNode;
      investors?: string | React.ReactNode;
    }>
  >([]);
  const [relatedInsights, setRelatedInsights] = useState<
    Array<{ id?: number; tag?: string; date?: string; title: string; content: string }>
  >([]);

  // Derive the "target" company id for this event from counterparties.
  // The API change requires `new_company_id`, which should be the `_new_company.id`
  // for the counterparty whose status is "Target" (when available).
  const targetNewCompanyId = useMemo(() => {
    const cps = Array.isArray(counterparties) ? counterparties : [];

    const statusOf = (cp: (typeof cps)[number]): string => {
      const s =
        cp?._counterpartys_type?.counterparty_status ||
        cp?._counterparty_type?.counterparty_status ||
        "";
      return typeof s === "string" ? s : "";
    };

    const targetCp = cps.find((cp) => /target/i.test(statusOf(cp)));
    const targetId = targetCp?._new_company?.id;
    if (typeof targetId === "number") return targetId;

    // Fallback: first non-investor company (often the target/investee), else first company id.
    const nonInvestor = cps.find((cp) => !Boolean(cp?._new_company?._is_that_investor));
    const nonInvestorId = nonInvestor?._new_company?.id;
    if (typeof nonInvestorId === "number") return nonInvestorId;

    const anyId = cps.find((cp) => typeof cp?._new_company?.id === "number")?._new_company?.id;
    return typeof anyId === "number" ? anyId : undefined;
  }, [counterparties]);

  useEffect(() => {
    const run = async () => {
      const startedAt = Date.now();
      try {
        const evId = event?.id;
        if (!evId) return;
        console.log("[Insights & Analysis] fetch start", {
          corporate_event_id: evId,
          new_company_id: targetNewCompanyId,
        });
        const qs = new URLSearchParams({
          corporate_event_id: String(evId),
          ...(typeof targetNewCompanyId === "number"
            ? { new_company_id: String(targetNewCompanyId) }
            : {}),
        });
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/content?${qs.toString()}`;
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
  }, [event?.id, targetNewCompanyId]);

  // Transform data for components
  const transactionData = {
    title: event?.description || "Corporate Event",
    subtitle: event?.long_description || undefined,
  };

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
        ? counterparty.counterparty_individuals.map((individual, idx) => (
                              <span key={individual.id}>
                                <a
                                  href={`/individual/${individual.individuals_id}`}
                className="text-blue-600 hover:underline"
                                >
                                  {individual.advisor_individuals}
                                </a>
              {idx < counterparty.counterparty_individuals.length - 1 && ", "}
                              </span>
          ))
        : "Not available";

    return {
      id: counterparty.id,
      name: nc?.name ?? "N/A",
      role:
        counterparty._counterpartys_type?.counterparty_status ||
                        counterparty._counterparty_type?.counterparty_status ||
        "N/A",
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
    const advisingHref = isInvestor
                          ? `/investors/${cp?.new_company_counterparty}`
                          : isDA
                          ? `/company/${Number(nc?.id)}`
                          : undefined;

    const advising = advisingHref
      ? createClickableElement(
          advisingHref,
                            nc?.name || "N/A",
          "text-blue-600 hover:underline"
        )
      : nc?.name || "N/A";

                        const advisorList = Array.isArray(anyA?.individuals)
                          ? (anyA.individuals as Array<{
                              id: number;
                              individuals_id?: number;
                              advisor_individuals: string;
                            }>)
                          : undefined;

    const individuals =
      Array.isArray(advisorList) && advisorList.length > 0
        ? advisorList.map((ind, idx) => (
                              <span key={ind.id}>
                                {typeof ind.individuals_id === "number" ? (
                                  <a
                                    href={`/individual/${ind.individuals_id}`}
                  className="text-blue-600 hover:underline"
                                  >
                                    {ind.advisor_individuals}
                                  </a>
                                ) : (
                                  <span>{ind.advisor_individuals}</span>
                                )}
              {idx < advisorList.length - 1 && ", "}
                              </span>
                            ))
                          : "Not available";

    return {
      id: a.id,
      name: a._new_company.name,
      logo,
      role: a._advisor_role?.counterparty_status || "Advisor",
      advising,
      individuals,
      href: `/advisor/${a._new_company.id}`,
    };
  });

  // Fetch related transactions + related insights (by primary sector), once we know primary sector id.
  useEffect(() => {
    const run = async () => {
      try {
        // Get all primary sector IDs
        const primarySectorIds = primarySectors
          .map((s) => s.id)
          .filter((id): id is number => typeof id === "number");
        
        if (primarySectorIds.length === 0 || typeof corporateEventId !== "number") return;

        // Get auth token for both API calls
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        
        if (!token) return;

        // Related transactions using the new endpoint
        try {
          const params = new URLSearchParams();
          params.append("event_id", String(corporateEventId));
          params.append("Page", "0");
          params.append("Per_page", "30");
          // Add primary_sectors_ids as array parameters
          primarySectorIds.forEach((id) => {
            params.append("primary_sectors_ids[]", String(id));
          });

          const response = await fetch(
            `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_resent_ce_transactions?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            
            const filtered = items.map((e: {
              id: number;
              description: string;
              announcement_date?: string;
              deal_type?: string;
              targets?: Array<{ id: number; name: string; path: string }>;
              buyers_investors?: Array<{ id: number; name: string; path: string }>;
            }) => {
              // Extract investors from buyers_investors array
              const investors = Array.isArray(e?.buyers_investors) && e.buyers_investors.length > 0
                ? (() => {
                    const investorsList = e.buyers_investors.slice(0, 3);
                    return (
                      <>
                        {investorsList.map((investor, idx) => {
                          const investorName = investor?.name || "";
                          const investorId = investor?.id;
                          const investorPath = investor?.path;
                          
                          if (investorId && investorPath) {
                            return (
                              <span key={investorId || idx}>
                                <a
                                  href={investorPath}
                                  className="text-blue-600 hover:underline"
                                >
                                  {investorName}
                                </a>
                                {idx < investorsList.length - 1 && ", "}
                              </span>
                            );
                          }
                          return (
                            <span key={idx}>
                              {investorName}
                              {idx < investorsList.length - 1 && ", "}
                            </span>
                          );
                        })}
                      </>
                    );
                  })()
                : undefined;

              // Extract targets from the targets array
              const targets = Array.isArray(e?.targets) && e.targets.length > 0
                ? e.targets.map((target, idx: number) => {
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
          } else {
            console.error("[Related Transactions] API error:", response.status);
            setRelatedTransactions([]);
          }
        } catch (error) {
          console.error("[Related Transactions] Fetch error:", error);
          setRelatedTransactions([]);
        }

        // Sector Insights & Analysis (by primary sector), excluding any already shown above.
        // Uses api:Z3F6JUiu/articles_based_on_sectors to fetch 5 most recent articles
        // whose Primary Sector(s) match the corporate event's primary sector(s)
        // Token is already available from above

        // Reuse primarySectorIds computed above
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
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/articles_based_on_sectors?${params.toString()}`;
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

  const reportButton = (
    <Button
      asChild
      size="sm"
      className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <a
        href={`mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
          `Contribute Data - ${event?.description ?? "Unknown"}`
        )}&body=${encodeURIComponent(
          "Please share the data you'd like to contribute for this corporate event page."
        )}`}
                            target="_blank"
                            rel="noopener noreferrer"
      >
        Contribute Data
      </a>
    </Button>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <TransactionHero transaction={transactionData} reportButton={reportButton} />

      <DealMetrics metrics={metricsData} />

      {insightsForEvent.length > 0 && (
        <InsightsSection insights={insightsForEvent} title="Insights & Analysis" />
      )}

      {counterpartiesData.length > 0 && (
        <CounterpartiesSection
          counterparties={counterpartiesData}
          createClickableElement={createClickableElement}
        />
      )}

      {advisorsData.length > 0 && (
        <AdvisorsSection
          advisors={advisorsData}
          createClickableElement={createClickableElement}
        />
      )}

      {relatedTransactions.length > 0 && (
        <RelatedTransactionsSection transactions={relatedTransactions} />
      )}

      {relatedInsights.length > 0 && (
        <InsightsSection
          insights={relatedInsights}
          title="Sector Insights & Analysis"
          showIcon={false}
        />
      )}
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
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg text-slate-600">
              Loading corporate event details...
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-800 font-medium">{error}</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
            <div className="text-slate-600">Corporate event not found</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <CorporateEventDetail data={data} />
      <Footer />
    </div>
  );
};

export default CorporateEventDetailPage;
