"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FollowedOnlyEmptyState } from "@/components/FollowedOnlyEmptyState";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import { CorporateEventDealMetrics } from "@/components/corporate-events/CorporateEventDealMetrics";
import type {
  CorporateEventListItem,
  CorporateEventsSearchFilters,
} from "@/app/corporate-events/actions";
import {
  createDefaultCorporateEventFilters,
  corporateEventsFiltersToSearchParams,
} from "@/lib/corporateEventsFilterPayload";
import {
  CORPORATE_EVENTS_COLUMN_CATEGORIES,
  CANONICAL_CORPORATE_EVENT_COLUMN_KEYS,
  DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS,
  PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS,
  corporateEventColumnKeysToVisibility,
  corporateEventVisibilityToColumnKeys,
  enforceCorporateEventColumnKeyOrder,
  getEffectiveFrozenCorporateEventColumnKeys,
  reorderCorporateEventColumnKeys,
} from "@/components/corporate-events/corporateEventsColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "@/components/corporate-events/corporateEventsColumnFilterMap";
import {
  compareCorporateEventSortValues,
  getCorporateEventColumnSortKind,
  getCorporateEventSortValueForColumn,
} from "@/components/corporate-events/corporateEventsTableSort";
import {
  derivePrimaryFromCompany,
  deriveSecondaryFromCompany,
  formatCorporateEventDate,
  getFundingStage,
  getTargetCompany,
  getTargetCountry,
  normalizeSectorName,
  renderSectorLinks,
} from "@/components/corporate-events/corporateEventsTableUtils";
import {
  extractAdvisorLinks,
  extractBuyerLinks,
  extractInvestorLinks,
  extractSellerLinks,
  extractTargetLinks,
  SEARCH_ENTITY_LINK_STYLE,
  type EntityLink,
} from "@/components/corporate-events/corporateEventsPartyLinks";
import { locationsService } from "@/lib/locationsService";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import {
  buildStickyColumnOffsets,
  getSearchTableColumnClassName,
  getStickyColumnStyle,
  SearchTablePinIndicator,
} from "@/components/search/searchTableUtils";
import { CSVExporter } from "@/utils/csvExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import type { CorporateEvent } from "@/types/corporateEvents";

export type CorporateEventItem = CorporateEventListItem;
export type Filters = CorporateEventsSearchFilters;

const CORPORATE_EVENTS_COLUMNS_STORAGE_KEY =
  "corporate-events-search-column-keys-v1";

interface CorporateEventColumnDefinition {
  key: string;
  label: string;
  wrap?: boolean;
  minWidth?: number;
}

const ALL_CORPORATE_EVENT_COLUMNS: CorporateEventColumnDefinition[] = [
  { key: "description", label: "Event", minWidth: 220 },
  { key: "announcement_date", label: "Date", minWidth: 130 },
  { key: "target", label: "Target", minWidth: 160 },
  { key: "target_hq", label: "Target HQ", minWidth: 120 },
  { key: "parties", label: "Parties", wrap: true, minWidth: 220 },
  { key: "deal_type", label: "Deal Type", minWidth: 130 },
  { key: "funding_stage", label: "Funding Stage", minWidth: 130 },
  { key: "investment_amount", label: "Amount (m)", minWidth: 120 },
  { key: "enterprise_value", label: "EV (m)", minWidth: 120 },
  { key: "advisors", label: "Advisors", wrap: true, minWidth: 180 },
  { key: "primary_sectors", label: "Primary Sectors", wrap: true, minWidth: 180 },
  { key: "secondary_sectors", label: "Secondary Sectors", wrap: true, minWidth: 180 },
];

const COLUMN_MAP = new Map(
  ALL_CORPORATE_EVENT_COLUMNS.map((column) => [column.key, column])
);

function getValidColumnKeys(keys: string[]): string[] {
  return enforceCorporateEventColumnKeyOrder(
    keys.filter((key) => CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key))
  );
}

export const CorporateEventsSearchSection = ({
  events,
  loading,
  error,
  pagination,
  fetchCorporateEvents,
  currentFilters,
  filterPinnedColumnKeys = [],
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
  isPortfolioOnlyFilter = false,
}: {
  events: CorporateEventItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    pageTotal: number;
    itemTotal: number;
  };
  fetchCorporateEvents: (
    page?: number,
    filters?: Filters,
    countsFilters?: Filters
  ) => Promise<void>;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (value: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: () => void) => void;
  isPortfolioOnlyFilter?: boolean;
}) => {
  const router = useRouter();
  const headerDidDragRef = useRef(false);
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [exportsLeft, setExportsLeft] = useState(0);
  const [secondaryToPrimaryMap, setSecondaryToPrimaryMap] = useState<
    Record<string, string>
  >({});
  const [primaryNameToId, setPrimaryNameToId] = useState<Record<string, number>>(
    {}
  );
  const [secondaryNameToId, setSecondaryNameToId] = useState<
    Record<string, number>
  >({});

  const showColumnsModal =
    externalShowColumnsModal !== undefined
      ? externalShowColumnsModal
      : internalShowColumnsModal;
  const setShowColumnsModal =
    externalSetShowColumnsModal ?? setInternalShowColumnsModal;
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS
  );
  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenCorporateEventColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(
    () => buildStickyColumnOffsets(frozenColumnKeys, ALL_CORPORATE_EVENT_COLUMNS),
    [frozenColumnKeys]
  );

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) =>
      enforceCorporateEventColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      )
    );
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CORPORATE_EVENTS_COLUMNS_STORAGE_KEY);
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
      console.warn("Unable to load corporate event column preferences:", storageError);
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        CORPORATE_EVENTS_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (storageError) {
      console.warn("Unable to save corporate event column preferences:", storageError);
    }
  }, [selectedColumnKeys, columnPrefsLoaded]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        if (!cancelled && Array.isArray(allSecondary)) {
          const map: Record<string, string> = {};
          const secIdMap: Record<string, number> = {};
          const primIdMap: Record<string, number> = {};
          for (const sec of allSecondary) {
            const secName = (sec as { sector_name?: string }).sector_name;
            const secId = (sec as { id?: number }).id;
            const primary = (sec as { related_primary_sector?: { sector_name?: string; id?: number } })
              .related_primary_sector;
            const primaryName = primary?.sector_name;
            const primaryId = primary?.id;
            if (secName && primaryName) {
              map[normalizeSectorName(secName)] = primaryName;
            }
            if (secName && typeof secId === "number") {
              secIdMap[normalizeSectorName(secName)] = secId;
            }
            if (primaryName && typeof primaryId === "number") {
              primIdMap[normalizeSectorName(primaryName)] = primaryId;
            }
          }
          setSecondaryToPrimaryMap(map);
          setSecondaryNameToId(secIdMap);
          setPrimaryNameToId((prev) => ({ ...prev, ...primIdMap }));
        }
        const primaries = await locationsService.getPrimarySectors();
        if (!cancelled && Array.isArray(primaries)) {
          const map: Record<string, number> = {};
          for (const primary of primaries) {
            const name = (primary as { sector_name?: string }).sector_name;
            const id = (primary as { id?: number }).id;
            if (name && typeof id === "number") {
              map[normalizeSectorName(name)] = id;
            }
          }
          setPrimaryNameToId((prev) => ({ ...map, ...prev }));
        }
      } catch (loadError) {
        console.warn("[Corporate Events] Failed to load sector mapping", loadError);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedColumns = useMemo(
    () =>
      selectedColumnKeys
        .map((key) => COLUMN_MAP.get(key))
        .filter((column): column is CorporateEventColumnDefinition => Boolean(column)),
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

  const sortedEvents = useMemo(() => {
    if (!sortState || !getCorporateEventColumnSortKind(sortState.key)) {
      return events;
    }
    const { key, dir } = sortState;
    return [...events].sort((a, b) =>
      compareCorporateEventSortValues(
        getCorporateEventSortValueForColumn(
          a as unknown as Record<string, unknown>,
          key
        ),
        getCorporateEventSortValueForColumn(
          b as unknown as Record<string, unknown>,
          key
        ),
        dir
      )
    );
  }, [events, sortState]);

  const handleEventClick = useCallback(
    (id: number) => {
      router.push(`/corporate-event/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = currentFilters ?? createDefaultCorporateEventFilters();
      void fetchCorporateEvents(page, { ...filters, Page: page });
    },
    [currentFilters, fetchCorporateEvents]
  );

  const handleSortColumn = useCallback((columnKey: string) => {
    if (!getCorporateEventColumnSortKind(columnKey)) return;
    setSortState((current) => {
      if (current?.key !== columnKey) return { key: columnKey, dir: "asc" };
      return { key: columnKey, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  const handleReorderTableColumns = useCallback(
    (dragKey: string, dropKey: string) => {
      setSelectedColumnKeys((current) =>
        enforceCorporateEventColumnKeyOrder(
          reorderCorporateEventColumnKeys(
            current,
            dragKey,
            dropKey,
            filterPinnedColumnKeys
          ),
          filterPinnedColumnKeys
        )
      );
    },
    [filterPinnedColumnKeys]
  );

  const isFrozenColumnKey = useCallback(
    (columnKey: string) => frozenColumnKeys.includes(columnKey),
    [frozenColumnKeys]
  );

  const exportToCsv = useCallback(async () => {
    if (events.length === 0) return;
    const limitCheck = await checkExportLimit();
    if (!limitCheck.canExport) {
      setExportsLeft(limitCheck.exportsLeft);
      setShowExportLimitModal(true);
      return;
    }

    try {
      const filters = currentFilters ?? createDefaultCorporateEventFilters();
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = corporateEventsFiltersToSearchParams({
        ...filters,
        Page: 1,
        Per_page: pagination.itemTotal || events.length,
      });
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l:develop/get_all_corporate_events?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
      const data = (await response.json()) as { items?: CorporateEvent[] };
      CSVExporter.exportCorporateEvents(data.items ?? events, "corporate_events_filtered");
    } catch (exportError) {
      console.error("Export CSV failed:", exportError);
    }
  }, [currentFilters, events, pagination.itemTotal]);

  useEffect(() => {
    onRegisterExportCSV?.(exportToCsv);
  }, [exportToCsv, onRegisterExportCSV]);

  const columnsModalInitial = useMemo(
    () => corporateEventColumnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const isFilterPinnedColumnKey = useCallback(
    (columnKey: string) => filterPinnedColumnKeys.includes(columnKey),
    [filterPinnedColumnKeys]
  );

  const renderEntityLinks = (
    links: EntityLink[],
    keyPrefix: string
  ): React.ReactNode => {
    if (links.length === 0) return null;
    return links.map((link, index) => (
      <span key={`${keyPrefix}-${link.id ?? link.name}-${index}`}>
        {link.href ? (
          <a
            href={link.href}
            className="link-blue"
            style={SEARCH_ENTITY_LINK_STYLE}
          >
            {link.name}
          </a>
        ) : (
          <span>{link.name}</span>
        )}
        {index < links.length - 1 && ", "}
      </span>
    ));
  };

  const renderPartiesCell = (event: CorporateEventItem) => {
    const partnership = /partnership/i.test(event.deal_type || "");
    const targets = extractTargetLinks(event);
    const buyers = extractBuyerLinks(event);
    const investors = extractInvestorLinks(event);
    const sellers = extractSellerLinks(event);
    const targetLabel = (event as unknown as Record<string, unknown>)
      .target_label as string | undefined;

    return (
      <div>
        <div className="muted-row">
          <strong>
            {targetLabel || (partnership ? "Target(s)" : "Target")}:
          </strong>{" "}
          {targets.length > 0
            ? renderEntityLinks(targets, "target")
            : "-"}
        </div>
        {buyers.length > 0 && (
          <div className="muted-row">
            <strong>Buyer(s):</strong> {renderEntityLinks(buyers, "buyer")}
          </div>
        )}
        {investors.length > 0 && (
          <div className="muted-row">
            <strong>Investor(s):</strong>{" "}
            {renderEntityLinks(investors, "investor")}
          </div>
        )}
        {!partnership && (
          <div className="muted-row">
            <strong>Seller(s):</strong>{" "}
            {sellers.length > 0
              ? renderEntityLinks(sellers, "seller")
              : "-"}
          </div>
        )}
      </div>
    );
  };

  const renderSectorCell = (
    text: string,
    nameToId: Record<string, number>,
    hrefPrefix: "/sector" | "/sub-sector"
  ): React.ReactNode => {
    const links = renderSectorLinks(text, nameToId);
    if (links.length === 0) return "-";
    return links.map((entry, index) => (
      <span key={`${entry.name}-${index}`}>
        {typeof entry.id === "number" ? (
          <a
            href={`${hrefPrefix}/${entry.id}`}
            className="link-blue"
            style={SEARCH_ENTITY_LINK_STYLE}
          >
            {entry.name}
          </a>
        ) : (
          entry.name
        )}
        {index < links.length - 1 && ", "}
      </span>
    ));
  };

  const renderEventCell = (
    columnKey: string,
    event: CorporateEventItem
  ): React.ReactNode => {
    const target = getTargetCompany(event);
    const fundingStage = getFundingStage(event);
    const isPartnership = /partnership/i.test(event.deal_type || "");

    switch (columnKey) {
      case "description": {
        const id = event.id;
        const description = event.description || "-";
        if (!id) return description;
        return (
          <a
            href={`/corporate-event/${id}`}
            className="company-name link-blue"
            style={SEARCH_ENTITY_LINK_STYLE}
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
              handleEventClick(id);
            }}
          >
            {description}
          </a>
        );
      }
      case "announcement_date":
        return formatCorporateEventDate(event.announcement_date);
      case "target":
        return (
          renderEntityLinks(extractTargetLinks(event), "target-col") || "-"
        );
      case "target_hq":
        return getTargetCountry(event);
      case "parties":
        return renderPartiesCell(event);
      case "deal_type":
        return event.deal_type || "-";
      case "funding_stage":
        return fundingStage || "-";
      case "investment_amount":
        return event.investment_data?.investment_amount_m &&
          event.investment_data?.currency?.Currency
          ? `${event.investment_data.currency.Currency}${Number(event.investment_data.investment_amount_m).toLocaleString(undefined, { maximumFractionDigits: 3 })}`
          : "-";
      case "enterprise_value":
        return event.ev_data?.enterprise_value_m && event.ev_data?.currency?.Currency
          ? `${event.ev_data.currency.Currency}${Number(event.ev_data.enterprise_value_m).toLocaleString(undefined, { maximumFractionDigits: 3 })}`
          : "-";
      case "advisors":
        return (
          renderEntityLinks(extractAdvisorLinks(event), "advisor") || "-"
        );
      case "primary_sectors":
        return renderSectorCell(
          derivePrimaryFromCompany(target, secondaryToPrimaryMap),
          primaryNameToId,
          "/sector"
        );
      case "secondary_sectors":
        return renderSectorCell(
          deriveSecondaryFromCompany(target),
          secondaryNameToId,
          "/sub-sector"
        );
      default:
        if (columnKey === "deal_metrics") {
          return (
            <CorporateEventDealMetrics
              dealType={event.deal_type}
              fundingStage={fundingStage || undefined}
              isPartnership={isPartnership}
              amountMillions={event.investment_data?.investment_amount_m}
              amountCurrency={event.investment_data?.currency?.Currency}
              evMillions={event.ev_data?.enterprise_value_m}
              evCurrency={event.ev_data?.currency?.Currency}
            />
          );
        }
        return "-";
    }
  };

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
          categories={CORPORATE_EVENTS_COLUMN_CATEGORIES}
          defaultVisibleColumnKeys={PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS}
          initial={columnsModalInitial}
          initialOrder={selectedColumnKeys}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          title="Columns"
          onCancel={() => setShowColumnsModal(false)}
          onApply={(visible, order) => {
            const nextKeys = corporateEventVisibilityToColumnKeys(
              visible,
              order ?? selectedColumnKeys
            );
            setSelectedColumnKeys(
              enforceCorporateEventColumnKeyOrder(nextKeys, filterPinnedColumnKeys)
            );
            setShowColumnsModal(false);
          }}
        />
      </>
    );

  if (loading && events.length === 0) {
    return (
      <div className="company-section">
        <div className="loading">Loading corporate events...</div>
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

  if (events.length === 0 && isPortfolioOnlyFilter) {
    return (
      <div className="company-section">
        <FollowedOnlyEmptyState entity="corporate events" />
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
                const sortKind = getCorporateEventColumnSortKind(column.key);
                const isActive = sortState?.key === column.key;
                const isDraggable = !isFrozenColumnKey(column.key);
                const isDragging = headerDragKey === column.key;
                const isDragOver =
                  headerDragOverKey === column.key && headerDragKey !== column.key;
                return (
                  <th
                    key={column.key}
                    className={getSearchTableColumnClassName(column, frozenColumnKeys, [
                      sortKind ? "company-table-th-sortable" : undefined,
                      isDraggable ? "company-table-th-draggable" : undefined,
                      isDragging ? "company-table-th-dragging" : undefined,
                      isDragOver ? "company-table-th-drag-over" : undefined,
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
                    draggable={isDraggable}
                    onDragStart={
                      isDraggable
                        ? (event) => {
                            headerDidDragRef.current = false;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", column.key);
                            setHeaderDragKey(column.key);
                            setHeaderDragOverKey(null);
                          }
                        : undefined
                    }
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setHeaderDragOverKey(column.key);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragKey =
                        event.dataTransfer.getData("text/plain") || headerDragKey;
                      if (dragKey) {
                        headerDidDragRef.current = true;
                        handleReorderTableColumns(dragKey, column.key);
                      }
                      setHeaderDragKey(null);
                      setHeaderDragOverKey(null);
                    }}
                    onDragEnd={() => {
                      setHeaderDragKey(null);
                      setHeaderDragOverKey(null);
                    }}
                    onClick={
                      sortKind
                        ? () => {
                            if (headerDidDragRef.current) {
                              headerDidDragRef.current = false;
                              return;
                            }
                            handleSortColumn(column.key);
                          }
                        : undefined
                    }
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
                    {column.label}
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
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length}>No corporate events found.</td>
              </tr>
            ) : (
              sortedEvents.map((event, index) => (
                <tr key={`${event.id ?? index}`}>
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
                      {renderEventCell(column.key, event)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">{generatePaginationButtons()}</div>
      <ExportLimitModal
        isOpen={showExportLimitModal}
        onClose={() => setShowExportLimitModal(false)}
        exportsLeft={exportsLeft}
        totalExports={EXPORT_LIMIT}
      />
      {columnsModalLayer}
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
    </div>
  );
};
