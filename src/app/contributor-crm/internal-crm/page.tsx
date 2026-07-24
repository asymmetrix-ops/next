"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { authService, contributorAccessService, isAdminUser } from "@/lib/contributorCrm/auth";
import {
  getCompanyChangeRequestSummaries,
  getFinMetricsCompanies,
  type FinMetricsCompanyItem,
  type GetFinMetricsCompaniesResponse,
  updateFinMetricsWorkflow,
} from "@/lib/contributorCrm/api";
import { ChangeReviewModal } from "@/components/contributor-crm/ChangeReviewModal";
import { EmailBuilderModal } from "@/components/contributor-crm/EmailBuilderModal";
import { FinMetricsReviewModal } from "@/components/contributor-crm/FinMetricsReviewModal";

function formatDate(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFinancialYears(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return Object.keys(value).join(", ");
  return String(value).replace(/[{}]/g, "");
}

function parseCompanyId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReviewType(
  value: string | null
): "company" | "fin-metrics" | null {
  return value === "company" || value === "fin-metrics" ? value : null;
}

function isAcceptedStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized.includes("accepted") || normalized.includes("approved");
}

/** Match ChangeReviewModal: treat empty status as needing review until decided. */
function isReviewableCompanyChangeStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return true;
  return normalized !== "approved" && normalized !== "rejected";
}

function summariesHavePendingCompanyReview(summaries: { status?: string | null }[]): boolean {
  return summaries.some((s) => isReviewableCompanyChangeStatus(s.status));
}

function InternalCrmPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReviewCompanyId = useMemo(
    () => parseCompanyId(searchParams.get("companyId")),
    [searchParams]
  );
  const requestedReviewType = useMemo(
    () => parseReviewType(searchParams.get("reviewType")),
    [searchParams]
  );
  const requestedReview = searchParams.get("review") === "1";
  const requestedCompanyName = searchParams.get("companyName")?.trim() ?? "";
  const autoReviewHandledRef = useRef(false);
  const teamLoginPath = useMemo(() => {
    const query = searchParams.toString();
    const redirect = `/internal-crm${query ? `?${query}` : ""}`;
    return `/team-login?redirect=${encodeURIComponent(redirect)}`;
  }, [searchParams]);
  const [data, setData] = useState<GetFinMetricsCompaniesResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(requestedCompanyName);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState(requestedCompanyName);
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [localRows, setLocalRows] = useState<FinMetricsCompanyItem[]>([]);
  const [emailBuilderRow, setEmailBuilderRow] = useState<FinMetricsCompanyItem | null>(null);
  const [reviewRow, setReviewRow] = useState<FinMetricsCompanyItem | null>(null);
  const [reviewReadOnly, setReviewReadOnly] = useState(false);
  const [fmReviewRow, setFmReviewRow] = useState<FinMetricsCompanyItem | null>(null);
  const [fmReviewReadOnly, setFmReviewReadOnly] = useState(false);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  /** `false` = no pending company change requests; omit key = unknown (use workflow flags). */
  const [companyChangeReviewPendingById, setCompanyChangeReviewPendingById] = useState<
    Record<number, boolean>
  >({});

  const fetchData = useCallback(async () => {
    const token = authService.getAuthToken();
    if (!token) {
      router.replace(teamLoginPath);
      return;
    }
    const user = authService.getUser();
    if (!user || !isAdminUser(user)) {
      const boundCompanyId = contributorAccessService.getCompanyId();
      router.replace(
        boundCompanyId != null ? `/contributor-crm/${boundCompanyId}` : "/contributor-crm/home-user"
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getFinMetricsCompanies(token, {
        search: appliedSearch || null,
        status_filter: appliedStatusFilter || null,
        page,
        per_page: perPage,
      });
      setData(res);
      setLocalRows(res.items);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
      setLocalRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedStatusFilter, page, router, teamLoginPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading) return;
    const token = authService.getAuthToken();
    if (!token) return;

    const candidates = localRows.filter(
      (row) =>
        (row.needs_review_company ?? row.needs_review) &&
        !isAcceptedStatus(row.status)
    );

    let cancelled = false;

    if (candidates.length === 0) {
      setCompanyChangeReviewPendingById((prev) => {
        const next = { ...prev };
        const keep = new Set(localRows.map((r) => r.company_id));
        for (const id of Object.keys(next)) {
          if (!keep.has(Number(id))) delete next[Number(id)];
        }
        return next;
      });
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      candidates.map((row) =>
        getCompanyChangeRequestSummaries(token, row.company_id)
          .then((summaries) => ({
            companyId: row.company_id,
            pending: summariesHavePendingCompanyReview(summaries),
          }))
          .catch(() => ({
            companyId: row.company_id,
            pending: true,
          }))
      )
    ).then((results) => {
      if (cancelled) return;
      setCompanyChangeReviewPendingById((prev) => {
        const next = { ...prev };
        for (const { companyId, pending } of results) {
          next[companyId] = pending;
        }
        const keep = new Set(localRows.map((r) => r.company_id));
        for (const id of Object.keys(next)) {
          if (!keep.has(Number(id))) delete next[Number(id)];
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, localRows]);

  useEffect(() => {
    if (!requestedReview || !requestedCompanyName) return;
    setSearch(requestedCompanyName);
    setAppliedSearch((current) =>
      current === requestedCompanyName ? current : requestedCompanyName
    );
    setAppliedStatusFilter(null);
    setPage(1);
  }, [requestedCompanyName, requestedReview]);

  const update = useCallback(
    (companyId: number, field: keyof FinMetricsCompanyItem, value: unknown) => {
      setLocalRows((r) =>
        r.map((row) =>
          row.company_id === companyId ? { ...row, [field]: value } : row
        )
      );
    },
    []
  );

  const companyName = (row: FinMetricsCompanyItem) =>
    typeof row.company_name === "number"
      ? String(row.company_name)
      : row.company_name;

  const firstVisibleCompanyId = localRows[0]?.company_id ?? null;

  const handleLogout = useCallback(() => {
    authService.clearUser();
    contributorAccessService.clear();
    router.replace("/contributor-crm/team-login");
  }, [router]);

  const exportCsv = useCallback(async () => {
    const token = authService.getAuthToken();
    if (!token) {
      router.replace(teamLoginPath);
      return;
    }

    setExporting(true);
    try {
      const params = {
        search: appliedSearch || null,
        status_filter: appliedStatusFilter || null,
      };
      const exportPerPage = 100;
      const first = await getFinMetricsCompanies(token, {
        ...params,
        page: 1,
        per_page: exportPerPage,
      });
      if (first.total === 0) {
        toast.error("No companies to export");
        return;
      }

      const allRows = [...first.items];
      if (first.total_pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.total_pages - 1 }, (_, i) =>
            getFinMetricsCompanies(token, {
              ...params,
              page: i + 2,
              per_page: exportPerPage,
            })
          )
        );
        for (const res of rest) {
          allRows.push(...res.items);
        }
      }

      const headers = [
        "Company ID",
        "Company Name",
        "Fin Metrics",
        "Added",
        "Financial Years",
        "Key Contact Email",
        "Date Contacted",
        "Follow Up Date",
        "Status",
      ];

      const escape = (val: unknown): string => {
        const str = val == null ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = allRows.map((row) => [
        escape(row.company_id),
        escape(companyName(row)),
        escape("YES"),
        escape(formatDate(row.fin_metrics_added_at)),
        escape(formatFinancialYears(row.financial_years)),
        escape(row.key_contact_email ?? ""),
        escape(row.date_contacted ?? ""),
        escape(row.follow_up_date ?? ""),
        escape(row.status ?? "Not Contributed"),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, [appliedSearch, appliedStatusFilter, router, teamLoginPath]);

  const saveWorkflow = useCallback(
    async (
      currentRow: FinMetricsCompanyItem,
      changes: Partial<
        Pick<
          FinMetricsCompanyItem,
          "key_contact_email" | "date_contacted" | "follow_up_date" | "contributed"
        >
      >
    ) => {
      const token = authService.getAuthToken();
      if (!token) {
        router.replace(teamLoginPath);
        return;
      }

      const nextRow: FinMetricsCompanyItem = { ...currentRow, ...changes };

      update(currentRow.company_id, "key_contact_email", nextRow.key_contact_email);
      update(currentRow.company_id, "date_contacted", nextRow.date_contacted);
      update(currentRow.company_id, "follow_up_date", nextRow.follow_up_date);
      update(currentRow.company_id, "contributed", nextRow.contributed);
      setSavingIds((ids) => [...ids, currentRow.company_id]);

      try {
        await updateFinMetricsWorkflow(token, {
          company_id: currentRow.company_id,
          key_contact_email: nextRow.key_contact_email,
          date_contacted: nextRow.date_contacted,
          follow_up_date: nextRow.follow_up_date,
          contributed: nextRow.contributed,
        });
      } catch (e) {
        update(currentRow.company_id, "key_contact_email", currentRow.key_contact_email);
        update(currentRow.company_id, "date_contacted", currentRow.date_contacted);
        update(currentRow.company_id, "follow_up_date", currentRow.follow_up_date);
        update(currentRow.company_id, "contributed", currentRow.contributed);
        toast.error((e as Error).message || "Failed to save workflow");
      } finally {
        setSavingIds((ids) => ids.filter((id) => id !== currentRow.company_id));
      }
    },
    [router, teamLoginPath, update]
  );

  useEffect(() => {
    if (!requestedReview || autoReviewHandledRef.current || loading) return;

    if (requestedReviewCompanyId == null) {
      autoReviewHandledRef.current = true;
      toast.error("Review target not found in internal CRM.");
      router.replace("/contributor-crm/internal-crm");
      return;
    }

    const targetRow = localRows.find(
      (row) => row.company_id === requestedReviewCompanyId
    );

    if (!targetRow) {
      if (requestedCompanyName && appliedSearch !== requestedCompanyName) return;
      autoReviewHandledRef.current = true;
      toast.error("Review target not found in internal CRM.");
      router.replace("/contributor-crm/internal-crm");
      return;
    }

    const needsCompanyChangeSummary =
      Boolean(targetRow.needs_review_company ?? targetRow.needs_review) &&
      !isAcceptedStatus(targetRow.status);
    const companyPendingResolved =
      companyChangeReviewPendingById[targetRow.company_id];

    if (needsCompanyChangeSummary && companyPendingResolved === undefined) {
      return;
    }

    const canOpenCompanyReview =
      !isAcceptedStatus(targetRow.status) &&
      (needsCompanyChangeSummary
        ? companyPendingResolved === true
        : Boolean(targetRow.needs_review_company ?? targetRow.needs_review));
    const canOpenFinMetricsReview = Boolean(targetRow.needs_review_fin_metrics);

    if (requestedReviewType === "fin-metrics") {
      if (canOpenFinMetricsReview) {
        setFmReviewRow(targetRow);
      } else {
        toast.error("No pending financial metrics review found for this company.");
      }
    } else if (requestedReviewType === "company") {
      if (canOpenCompanyReview) {
        setReviewRow(targetRow);
      } else {
        toast.error("No pending company review found for this company.");
      }
    } else if (canOpenCompanyReview) {
      setReviewRow(targetRow);
    } else if (canOpenFinMetricsReview) {
      setFmReviewRow(targetRow);
    } else {
      toast.error("No pending review found for this company.");
    }

    autoReviewHandledRef.current = true;
    router.replace("/contributor-crm/internal-crm");
  }, [
    appliedSearch,
    loading,
    localRows,
    requestedCompanyName,
    requestedReview,
    requestedReviewCompanyId,
    requestedReviewType,
    router,
    companyChangeReviewPendingById,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-mono">
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] tracking-[0.2em] text-gray-400 uppercase mb-1.5">
            Asymmetrix Internal
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900 m-0">
            Financial Metrics Outreach
          </h1>
          <div className="text-xs text-gray-400 mt-1">
            {data ? `${data.total} companies tracked` : "—"}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearch((e.target as HTMLInputElement).value);
                setAppliedStatusFilter(statusFilter || null);
                setPage(1);
              }
            }}
            className="bg-white border border-gray-200 rounded-md px-3.5 py-2 text-gray-700 text-xs w-52 outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-700 outline-none"
          >
            <option value="">All statuses</option>
            <option value="Not Contributed">Not Contributed</option>
            <option value="Contributed">Contributed</option>
            <option value="Contributed & Approved">Contributed &amp; Approved</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setAppliedSearch(search);
              setAppliedStatusFilter(statusFilter || null);
              setPage(1);
            }}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50"
          >
            Apply
          </button>
          {firstVisibleCompanyId != null && (
            <Link
              href={`/contributor-crm/${firstVisibleCompanyId}`}
              className="px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Contributor CRM
            </Link>
          )}
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting || loading || !data?.total}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    { key: "company", label: "Company" },
                    { key: "fin-metrics-badge", label: "Fin Metrics" },
                    { key: "added", label: "Added" },
                    { key: "years", label: "Years" },
                    { key: "key-contact", label: "Key Contact" },
                    { key: "date-contacted", label: "Date Contacted" },
                    { key: "follow-up", label: "Follow Up" },
                    { key: "status", label: "Status" },
                    { key: "contributor-page", label: "Contributor Page" },
                    { key: "company-profile", label: "Company Review" },
                    { key: "fin-metrics-review", label: "Fin Metrics" },
                    { key: "email", label: "Email" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="text-left py-2.5 px-3 text-gray-400 font-medium tracking-wider uppercase text-[10px] whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {localRows.map((row) => (
                  <tr
                    key={row.company_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-gray-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/contributor-crm/${row.company_id}`}
                          className="text-gray-800 hover:text-blue-600 hover:underline"
                        >
                          {companyName(row)}
                        </Link>
                        {savingIds.includes(row.company_id) && (
                          <span className="text-[10px] uppercase tracking-wider text-[rgba(59,130,246,1)]">
                            Saving
                          </span>
                        )}
                        {(row.needs_review_company ?? row.needs_review) &&
                          !isAcceptedStatus(row.status) &&
                          companyChangeReviewPendingById[row.company_id] !== false && (
                          <span className="rounded-full border border-[rgba(59,130,246,0.5)] bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[rgba(59,130,246,1)]">
                            Needs review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded tracking-wider border border-emerald-200">
                        YES
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {formatDate(row.fin_metrics_added_at)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {formatFinancialYears(row.financial_years)}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        defaultValue={row.key_contact_email ?? ""}
                        placeholder="Add emails, comma separated..."
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (row.key_contact_email ?? "")) {
                            void saveWorkflow(row, {
                              key_contact_email: v || null,
                            });
                          }
                        }}
                        className="w-56 border-b border-gray-200 bg-transparent py-0.5 text-xs text-gray-700 outline-none placeholder:text-gray-300 focus:border-blue-400"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        defaultValue={row.date_contacted ?? ""}
                        onBlur={(e) => {
                          const value = e.target.value || null;
                          if (value !== row.date_contacted) {
                            void saveWorkflow(row, { date_contacted: value });
                          }
                        }}
                        className="bg-transparent border-b border-gray-200 text-gray-600 text-xs outline-none py-0.5 focus:border-blue-400"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        defaultValue={row.follow_up_date ?? ""}
                        onBlur={(e) => {
                          const value = e.target.value || null;
                          if (value !== row.follow_up_date) {
                            void saveWorkflow(row, { follow_up_date: value });
                          }
                        }}
                        className="bg-transparent border-b border-gray-200 text-[rgba(59,130,246,1)] text-xs outline-none py-0.5 focus:border-blue-400"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider border ${row.status ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                        {row.status ?? "Not Contributed"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/contributor-crm/${row.company_id}`}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Open
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      {isAcceptedStatus(row.status) ? (
                        <button
                          type="button"
                          onClick={() => { setReviewReadOnly(true); setReviewRow(row); }}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          View
                        </button>
                      ) : (row.needs_review_company ?? row.needs_review) &&
                        companyChangeReviewPendingById[row.company_id] !== false ? (
                        <button
                          type="button"
                          onClick={() => { setReviewReadOnly(false); setReviewRow(row); }}
                          className="rounded-md border border-[rgba(59,130,246,0.5)] bg-[rgba(59,130,246,0.08)] px-2 py-1 text-xs text-[rgba(59,130,246,1)] hover:bg-[rgba(59,130,246,0.14)]"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {isAcceptedStatus(row.status) ? (
                        <button
                          type="button"
                          onClick={() => { setFmReviewReadOnly(true); setFmReviewRow(row); }}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          View
                        </button>
                      ) : row.needs_review_fin_metrics ? (
                        <button
                          type="button"
                          onClick={() => { setFmReviewReadOnly(false); setFmReviewRow(row); }}
                          className="rounded-md border border-[rgba(59,130,246,0.5)] bg-[rgba(59,130,246,0.08)] px-2 py-1 text-xs text-[rgba(59,130,246,1)] hover:bg-[rgba(59,130,246,0.14)]"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setEmailBuilderRow(row)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 text-xs text-gray-400">
              <span>
                Page {data.page} of {data.total_pages} ({data.total} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {reviewRow && (
        <ChangeReviewModal
          row={reviewRow}
          readOnly={reviewReadOnly}
          onClose={() => { setReviewRow(null); setReviewReadOnly(false); }}
          onApplied={() => { void fetchData(); }}
        />
      )}

      {/* Fin metrics review modal */}
      {fmReviewRow && (
        <FinMetricsReviewModal
          row={fmReviewRow}
          readOnly={fmReviewReadOnly}
          onClose={() => { setFmReviewRow(null); setFmReviewReadOnly(false); }}
          onApplied={() => {
            void fetchData();
          }}
        />
      )}

      {/* Email builder modal */}
      {emailBuilderRow && (
        <EmailBuilderModal
          row={emailBuilderRow}
          onClose={() => setEmailBuilderRow(null)}
        />
      )}
    </div>
  );
}

export default function InternalCrmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-8 font-mono text-gray-400">
          Loading…
        </div>
      }
    >
      <InternalCrmPageInner />
    </Suspense>
  );
}
