import { useState, useCallback } from "react";
import type {
  PortfolioCompany,
  PortfolioResponse,
  PaginationState,
} from "@/types/investor";

// Safely parse JSON that might already be an object or might be invalid
const safeParseJSON = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof value === "object") return (value as T) ?? fallback;
  return fallback;
};

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

const mapPortfolioItem = (item: unknown): PortfolioCompany => {
  const obj = asRecord(item);
  const sectors = safeParseJSON<
    Array<{ sector_name: string; Sector_importance: string }>
  >(obj["sectors_id"], []);

  const locations = safeParseJSON<{ Country?: string }>(obj["_locations"], {});

  const linkedinDataNew = safeParseJSON<{
    linkedin_employee?: number;
    linkedin_logo?: string;
  }>(obj["_linkedin_data_of_new_company"], {});

  const linkedinDataOld = safeParseJSON<{
    LinkedIn_Employee?: number;
    linkedin_logo?: string;
  }>(obj["linkedin_data"], {});

  const relatedIndividuals = safeParseJSON<
    Array<{ id: number; advisor_individuals: string; linkedin_URL?: string }>
  >(obj["related_to_investor_individuals"], []);

  const result = {
    id: Number(obj["id"]),
    name: String((obj["name"] as string) ?? ""),
    locations_id: Number((obj["locations_id"] as number) ?? 0),
    sectors_id: Array.isArray(sectors) ? sectors : [],
    description: String((obj["description"] as string) ?? ""),
    linkedin_data: {
      LinkedIn_Employee: Number(linkedinDataOld?.LinkedIn_Employee ?? 0),
      linkedin_logo: String(linkedinDataOld?.linkedin_logo ?? ""),
    },
    _locations: {
      Country: String(locations?.Country ?? ""),
    },
    _is_that_investor: Boolean((obj["_is_that_investor"] as boolean) ?? false),
    _linkedin_data_of_new_company: {
      linkedin_employee: Number(linkedinDataNew?.linkedin_employee ?? 0),
      linkedin_logo: String(linkedinDataNew?.linkedin_logo ?? ""),
    },
    related_to_investor_individuals: relatedIndividuals,
  } as Record<string, unknown>;

  return result as unknown as PortfolioCompany;
};

const initialPaginationState: PaginationState = {
  itemsReceived: 0,
  curPage: 1,
  nextPage: null,
  prevPage: null,
  offset: 0,
  perPage: 50,
  pageTotal: 0,
};

export const usePortfolioData = (investorId: string) => {
  // Current portfolio state
  const [portfolioCompanies, setPortfolioCompanies] = useState<
    PortfolioCompany[]
  >([]);
  const [portfolioPagination, setPortfolioPagination] =
    useState<PaginationState>(initialPaginationState);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Past portfolio state
  const [pastPortfolioCompanies, setPastPortfolioCompanies] = useState<
    PortfolioCompany[]
  >([]);
  const [pastPortfolioPagination, setPastPortfolioPagination] =
    useState<PaginationState>(initialPaginationState);
  const [pastPortfolioLoading, setPastPortfolioLoading] = useState(false);

  const fetchPortfolioCompanies = useCallback(
    async (page: number = 1) => {
      setPortfolioLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        const params = new URLSearchParams();
        params.append("new_comp_id", investorId);
        params.append("page", page.toString());
        params.append("per_page", "50");

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Portfolio API request failed: ${response.statusText}`
          );
        }

        const raw = await response.json();

        // New API returns a flat array of items with pagination fields duplicated per item
        if (Array.isArray(raw)) {
          const items = raw.map(mapPortfolioItem);
          const first = raw[0] ?? {};
          setPortfolioCompanies(items);
          setPortfolioPagination({
            itemsReceived: Number(first?.itemsreceived ?? items.length ?? 0),
            curPage: Number(first?.curpage ?? page ?? 1),
            nextPage:
              first?.nextpage === null || first?.nextpage === undefined
                ? null
                : Number(first?.nextpage),
            prevPage:
              first?.prevpage === null || first?.prevpage === undefined
                ? null
                : Number(first?.prevpage),
            offset: Number(first?.offset ?? 0),
            perPage: 50,
            pageTotal: Number(first?.pagetotal ?? 0),
          });
        } else {
          // Backward compatibility with old shape { items, itemsReceived, ... }
          const data = raw as PortfolioResponse;
          setPortfolioCompanies((data.items || []).map(mapPortfolioItem));
          setPortfolioPagination({
            itemsReceived: data.itemsReceived || 0,
            curPage: data.curPage || 1,
            nextPage: data.nextPage || null,
            prevPage: data.prevPage || null,
            offset: data.offset || 0,
            perPage: data.perPage || 50,
            pageTotal: data.pageTotal || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching portfolio companies:", err);
      } finally {
        setPortfolioLoading(false);
      }
    },
    [investorId]
  );

  const fetchPastPortfolioCompanies = useCallback(
    async (page: number = 1) => {
      setPastPortfolioLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        const params = new URLSearchParams();
        params.append("new_comp_id", investorId);
        params.append("page", page.toString());
        params.append("per_page", "50");

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Past Portfolio API request failed: ${response.statusText}`
          );
        }

        const raw = await response.json();

        if (Array.isArray(raw)) {
          const items = raw.map(mapPortfolioItem);
          const first = raw[0] ?? {};
          setPastPortfolioCompanies(items);
          setPastPortfolioPagination({
            itemsReceived: Number(first?.itemsreceived ?? items.length ?? 0),
            curPage: Number(first?.curpage ?? page ?? 1),
            nextPage:
              first?.nextpage === null || first?.nextpage === undefined
                ? null
                : Number(first?.nextpage),
            prevPage:
              first?.prevpage === null || first?.prevpage === undefined
                ? null
                : Number(first?.prevpage),
            offset: Number(first?.offset ?? 0),
            perPage: 50,
            pageTotal: Number(first?.pagetotal ?? 0),
          });
        } else {
          const data = raw as PortfolioResponse;
          setPastPortfolioCompanies((data.items || []).map(mapPortfolioItem));
          setPastPortfolioPagination({
            itemsReceived: data.itemsReceived || 0,
            curPage: data.curPage || 1,
            nextPage: data.nextPage || null,
            prevPage: data.prevPage || null,
            offset: data.offset || 0,
            perPage: data.perPage || 50,
            pageTotal: data.pageTotal || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching past portfolio companies:", err);
      } finally {
        setPastPortfolioLoading(false);
      }
    },
    [investorId]
  );

  return {
    // Current portfolio
    portfolioCompanies,
    portfolioPagination,
    portfolioLoading,
    fetchPortfolioCompanies,

    // Past portfolio
    pastPortfolioCompanies,
    pastPortfolioPagination,
    pastPortfolioLoading,
    fetchPastPortfolioCompanies,
  };
};
