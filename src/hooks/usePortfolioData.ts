import { useState, useCallback } from "react";
import type {
  PortfolioCompany,
  PortfolioResponse,
  PaginationState,
} from "@/types/investor";

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

        const data: PortfolioResponse = await response.json();
        setPortfolioCompanies(data.items || []);
        setPortfolioPagination({
          itemsReceived: data.itemsReceived || 0,
          curPage: data.curPage || 1,
          nextPage: data.nextPage || null,
          prevPage: data.prevPage || null,
          offset: data.offset || 0,
          perPage: data.perPage || 50,
          pageTotal: data.pageTotal || 0,
        });
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

        const data: PortfolioResponse = await response.json();
        setPastPortfolioCompanies(data.items || []);
        setPastPortfolioPagination({
          itemsReceived: data.itemsReceived || 0,
          curPage: data.curPage || 1,
          nextPage: data.nextPage || null,
          prevPage: data.prevPage || null,
          offset: data.offset || 0,
          perPage: data.perPage || 50,
          pageTotal: data.pageTotal || 0,
        });
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
