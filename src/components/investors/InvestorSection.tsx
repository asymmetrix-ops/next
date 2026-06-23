"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FollowedOnlyEmptyState } from "@/components/FollowedOnlyEmptyState";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import type { InvestorListItem, InvestorsSearchFilters } from "@/app/investors/actions";
import { createDefaultInvestorFilters } from "@/lib/investorsFilterPayload";
import {
  CANONICAL_INVESTOR_COLUMN_KEYS,
  DEFAULT_VISIBLE_INVESTOR_COLUMN_KEYS,
  INVESTORS_COLUMN_CATEGORIES,
  PROD_DEFAULT_INVESTOR_COLUMN_KEYS,
  enforceInvestorColumnKeyOrder,
  getEffectiveFrozenInvestorColumnKeys,
  investorColumnKeysToVisibility,
  investorVisibilityToColumnKeys,
} from "@/components/investors/investorsColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "@/components/investors/investorsColumnFilterMap";
import { getInvestorFieldAliasesForColumn } from "@/components/investors/investorsColumnFields";
import {
  compareInvestorSortValues,
  getInvestorColumnSortKind,
  getInvestorSortValueForColumn,
} from "@/components/investors/investorsTableSort";
import { SearchEntityDescription } from "@/components/search/SearchEntityDescription";
import { SearchEntityLogo } from "@/components/search/SearchEntityLogo";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import {
  buildStickyColumnOffsets,
  getSearchTableColumnClassName,
  getStickyColumnStyle,
  SearchTablePinIndicator,
} from "@/components/search/searchTableUtils";
import { formatWebsiteLabel, normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";

export type Investor = InvestorListItem;
export type Filters = InvestorsSearchFilters;

const INVESTORS_COLUMNS_STORAGE_KEY = "investors-search-column-keys-v1";

interface InvestorColumnDefinition {
  key: string;
  label: string;
  wrap?: boolean;
  minWidth?: number;
}

const readInvestorValue = (
  investor: Investor,
  aliases: readonly string[]
): unknown => {
  const rec = investor as unknown as Record<string, unknown>;
  for (const alias of aliases) {
    const parts = alias.split(".");
    let current: unknown = rec;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current != null && current !== "") return current;
  }
  return undefined;
};

const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString();
};

const formatTimeSinceLastInvestment = (investor: Investor): string => {
  const lastInvestment = investor.last_investment;
  if (lastInvestment?.display) return String(lastInvestment.display);
  const raw = readInvestorValue(investor, [
    ...getInvestorFieldAliasesForColumn("years_since_last_investment"),
  ]);
  if (raw == null || raw === "") return "-";
  if (typeof raw === "object") {
    const display = (raw as Record<string, unknown>).display;
    if (display) return String(display);
  }
  return String(raw);
};

const ALL_INVESTOR_COLUMNS: InvestorColumnDefinition[] = [
  { key: "logo", label: "Logo", minWidth: 88 },
  { key: "name", label: "Name", minWidth: 160 },
  { key: "type", label: "Type", minWidth: 140 },
  { key: "description", label: "Description", wrap: true, minWidth: 280 },
  { key: "portfolio_companies", label: "Current D&A Portfolio Companies", minWidth: 160 },
  { key: "primary_sectors", label: "D&A Primary Sectors", wrap: true, minWidth: 180 },
  { key: "linkedin_members", label: "LinkedIn Members", minWidth: 130 },
  { key: "country", label: "Country", minWidth: 120 },
  { key: "follow", label: "My Portfolio", minWidth: 120 },
  { key: "hq", label: "HQ", minWidth: 120 },
  { key: "website", label: "Website", wrap: true, minWidth: 220 },
  { key: "linkedin_url", label: "LinkedIn URL", wrap: true, minWidth: 220 },
  { key: "year_founded", label: "Year Founded", minWidth: 110 },
  { key: "total_investments", label: "Total Investments", minWidth: 130 },
  { key: "years_since_last_investment", label: "Time since last investment", minWidth: 170 },
  { key: "sub_region", label: "Sub-Region", minWidth: 130 },
  { key: "state", label: "State/Province", minWidth: 130 },
  { key: "city", label: "City", minWidth: 120 },
];

const COLUMN_MAP = new Map(ALL_INVESTOR_COLUMNS.map((column) => [column.key, column]));

function getValidColumnKeys(keys: string[]): string[] {
  return enforceInvestorColumnKeyOrder(
    keys.filter((key) => CANONICAL_INVESTOR_COLUMN_KEYS.includes(key))
  );
}

function renderInvestorCell(
  columnKey: string,
  investor: Investor,
  index: number,
  onInvestorClick: (id: number) => void
): React.ReactNode {
  switch (columnKey) {
    case "logo":
      return (
        <SearchEntityLogo
          logo={String(investor.linkedin_logo || "")}
          name={String(investor.company_name || "")}
        />
      );
    case "name": {
      const id = investor.original_new_company_id;
      const name = investor.company_name || "-";
      if (!id) return name;
      return (
        <a
          href={`/investors/${id}`}
          className="company-name"
          style={{ textDecoration: "none", color: "#3b82f6" }}
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
            onInvestorClick(id);
          }}
        >
          {name}
        </a>
      );
    }
    case "type":
      return investor.investor_type?.length ? investor.investor_type.join(", ") : "-";
    case "description":
      return <SearchEntityDescription description={investor.description || "-"} />;
    case "portfolio_companies":
      return formatNumber(investor.number_of_active_investments);
    case "primary_sectors":
      return investor.da_primary_sector_names?.length ? (
        <div className="sectors-list">{investor.da_primary_sector_names.join(", ")}</div>
      ) : (
        "-"
      );
    case "linkedin_members":
      return formatNumber(investor.linkedin_members);
    case "country":
      return investor.country || "-";
    case "follow": {
      const id = investor.original_new_company_id;
      if (!id) return null;
      return (
        <div
          className="company-follow-cell"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <InlineFollowButton
            followKey="followed_investors"
            entityId={id}
            label={investor.company_name || ""}
            icon="star"
          />
        </div>
      );
    }
    case "hq":
      return String(readInvestorValue(investor, getInvestorFieldAliasesForColumn("hq")) || "-");
    case "website": {
      const raw = readInvestorValue(investor, getInvestorFieldAliasesForColumn("website"));
      const href = normalizeWebsiteUrl(raw);
      if (!href) return "-";
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="company-website-link"
          style={{ color: "#3b82f6", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {formatWebsiteLabel(href)}
        </a>
      );
    }
    case "linkedin_url": {
      const raw = readInvestorValue(investor, getInvestorFieldAliasesForColumn("linkedin_url"));
      const href = normalizeLinkedInProfileUrl(raw) ?? normalizeWebsiteUrl(raw);
      if (!href) return "-";
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="company-website-link"
          style={{ color: "#3b82f6", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {formatWebsiteLabel(href)}
        </a>
      );
    }
    case "year_founded":
      return String(
        readInvestorValue(investor, getInvestorFieldAliasesForColumn("year_founded")) || "-"
      );
    case "total_investments":
      return formatNumber(
        readInvestorValue(investor, getInvestorFieldAliasesForColumn("total_investments"))
      );
    case "years_since_last_investment":
      return formatTimeSinceLastInvestment(investor);
    case "sub_region":
      return String(
        readInvestorValue(investor, getInvestorFieldAliasesForColumn("sub_region")) || "-"
      );
    case "state":
      return String(
        readInvestorValue(investor, getInvestorFieldAliasesForColumn("state")) || "-"
      );
    case "city":
      return String(
        readInvestorValue(investor, getInvestorFieldAliasesForColumn("city")) || "-"
      );
    default:
      return "-";
  }
}

export const InvestorSection = ({
  investors,
  loading,
  error,
  pagination,
  fetchInvestors,
  currentFilters,
  filterPinnedColumnKeys = [],
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  isPortfolioOnlyFilter = false,
}: {
  investors: Investor[];
  loading: boolean;
  error: string | null;
  pagination: {
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    pageTotal: number;
    itemsTotal: number;
  };
  fetchInvestors: (
    page?: number,
    filters?: Filters,
    countsFilters?: Filters
  ) => Promise<void>;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (value: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  isPortfolioOnlyFilter?: boolean;
}) => {
  const router = useRouter();
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const showColumnsModal =
    externalShowColumnsModal !== undefined
      ? externalShowColumnsModal
      : internalShowColumnsModal;
  const setShowColumnsModal =
    externalSetShowColumnsModal ?? setInternalShowColumnsModal;
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    DEFAULT_VISIBLE_INVESTOR_COLUMN_KEYS
  );
  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenInvestorColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(
    () => buildStickyColumnOffsets(frozenColumnKeys, ALL_INVESTOR_COLUMNS),
    [frozenColumnKeys]
  );

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) =>
      enforceInvestorColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      )
    );
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(INVESTORS_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedColumnKeys(
            getValidColumnKeys(
              parsed.filter((key): key is string => typeof key === "string")
            )
          );
        }
      }
    } catch (storageError) {
      console.warn("Unable to load investor column preferences:", storageError);
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        INVESTORS_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (storageError) {
      console.warn("Unable to save investor column preferences:", storageError);
    }
  }, [selectedColumnKeys, columnPrefsLoaded]);

  const selectedColumns = useMemo(
    () =>
      selectedColumnKeys
        .map((key) => COLUMN_MAP.get(key))
        .filter((column): column is InvestorColumnDefinition => Boolean(column)),
    [selectedColumnKeys]
  );

  useEffect(() => {
    onColumnsCountChange?.(selectedColumns.length);
  }, [selectedColumns.length, onColumnsCountChange]);

  useEffect(() => {
    if (sortState && !selectedColumnKeys.includes(sortState.key)) {
      setSortState(null);
    }
  }, [selectedColumnKeys, sortState]);

  const sortedInvestors = useMemo(() => {
    if (!sortState || !getInvestorColumnSortKind(sortState.key)) {
      return investors;
    }
    const { key, dir } = sortState;
    return [...investors].sort((a, b) =>
      compareInvestorSortValues(
        getInvestorSortValueForColumn(a as Record<string, unknown>, key),
        getInvestorSortValueForColumn(b as Record<string, unknown>, key),
        dir
      )
    );
  }, [investors, sortState]);

  const handleInvestorClick = useCallback(
    (id: number) => {
      router.push(`/investors/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = currentFilters ?? createDefaultInvestorFilters();
      void fetchInvestors(page, { ...filters, page });
    },
    [currentFilters, fetchInvestors]
  );

  const handleSortColumn = useCallback((columnKey: string) => {
    if (!getInvestorColumnSortKind(columnKey)) return;
    setSortState((current) => {
      if (current?.key !== columnKey) return { key: columnKey, dir: "asc" };
      return { key: columnKey, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  const columnsModalInitial = useMemo(
    () => investorColumnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const isFilterPinnedColumnKey = useCallback(
    (columnKey: string) => filterPinnedColumnKeys.includes(columnKey),
    [filterPinnedColumnKeys]
  );

  const generatePaginationButtons = () => {
    const buttons: React.ReactNode[] = [];
    const maxVisible = 7;
    const totalPages =
      pagination.pageTotal ||
      (pagination.nextPage != null
        ? Math.max(pagination.nextPage, pagination.curPage + 1)
        : 0);
    const prevPage = pagination.prevPage ?? pagination.curPage - 1;
    const nextPage = pagination.nextPage ?? pagination.curPage + 1;

    if (totalPages <= 1) return buttons;

    buttons.push(
      <button
        key="previous"
        type="button"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(prevPage)}
        disabled={pagination.curPage <= 1}
      >
        Previous
      </button>
    );

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-button ${i === pagination.curPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-button ${pagination.curPage === 1 ? "active" : ""}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      if (pagination.curPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      const start = Math.max(2, pagination.curPage - 1);
      const end = Math.min(totalPages - 1, pagination.curPage + 1);
      for (let i = start; i <= end; i++) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-button ${i === pagination.curPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }

      if (pagination.curPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      buttons.push(
        <button
          key={totalPages}
          type="button"
          className={`pagination-button ${totalPages === pagination.curPage ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    buttons.push(
      <button
        key="next"
        type="button"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(nextPage)}
        disabled={pagination.curPage >= totalPages}
      >
        Next
      </button>
    );

    return buttons;
  };

  const columnsModalLayer =
    showColumnsModal &&
    (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 199,
            cursor: "default",
          }}
          onClick={() => setShowColumnsModal(false)}
          aria-hidden="true"
        />
        <ColumnsControlRoom
          categories={INVESTORS_COLUMN_CATEGORIES}
          defaultVisibleColumnKeys={PROD_DEFAULT_INVESTOR_COLUMN_KEYS}
          initial={columnsModalInitial}
          initialOrder={selectedColumnKeys}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          title="Columns"
          onCancel={() => setShowColumnsModal(false)}
          onApply={(visible, order) => {
            const nextKeys = investorVisibilityToColumnKeys(
              visible,
              order ?? selectedColumnKeys
            );
            setSelectedColumnKeys(
              enforceInvestorColumnKeyOrder(nextKeys, filterPinnedColumnKeys)
            );
            setShowColumnsModal(false);
          }}
        />
      </>
    );

  if (loading && investors.length === 0) {
    return (
      <div className="company-section">
        <div className="loading">Loading investors...</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-section">
        <div className="error">{error}</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  if (investors.length === 0 && isPortfolioOnlyFilter) {
    return (
      <div className="company-section">
        <FollowedOnlyEmptyState entity="investors" />
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  return (
    <div className="company-section">
      <div className="company-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              {selectedColumns.map((column) => {
                const sortKind = getInvestorColumnSortKind(column.key);
                const isActive = sortState?.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={getSearchTableColumnClassName(column, frozenColumnKeys, [
                      sortKind ? "company-table-th-sortable" : undefined,
                    ])}
                    style={{
                      minWidth: column.minWidth,
                      ...getStickyColumnStyle(
                        column.key,
                        stickyColumnOffsets,
                        column.minWidth,
                        true
                      ),
                    }}
                    onClick={sortKind ? () => handleSortColumn(column.key) : undefined}
                    aria-sort={
                      sortKind
                        ? isActive
                          ? sortState?.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                  >
                    {column.key === "follow" ? (
                      <span
                        className="company-follow-header-label"
                        style={{ display: "block", textAlign: "left" }}
                      >
                        {column.label}
                      </span>
                    ) : (
                      column.label
                    )}
                    {isFilterPinnedColumnKey(column.key) && (
                      <SearchTablePinIndicator title={FILTER_PINNED_TOOLTIP} />
                    )}
                    {sortKind && isActive && (
                      <span className="company-table-sort-indicator">
                        {sortState?.dir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedInvestors.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length}>No investors found.</td>
              </tr>
            ) : (
              sortedInvestors.map((investor, index) => (
                <tr key={`${investor.original_new_company_id ?? investor.id ?? index}`}>
                  {selectedColumns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      className={getSearchTableColumnClassName(column, frozenColumnKeys)}
                      style={{
                        minWidth: column.minWidth,
                        ...getStickyColumnStyle(
                          column.key,
                          stickyColumnOffsets,
                          column.minWidth
                        ),
                      }}
                    >
                      {renderInvestorCell(
                        column.key,
                        investor,
                        index,
                        handleInvestorClick
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">{generatePaginationButtons()}</div>
      {columnsModalLayer}
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
    </div>
  );
};
