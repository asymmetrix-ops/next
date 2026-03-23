"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { decodeJwt, type JWTPayload } from "jose";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import CompaniesPage from "@/app/companies/page";
import { CompaniesEditContext } from "@/app/companies/CompaniesEditContext";
import CompanyProfileForm, {
  fromApiRecord,
  type CompanyFormData,
  type CompanyFormPayload,
} from "@/app/admin/data-entry/_components/CompanyProfileForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { useSearchParams } from "next/navigation";

const NEW_COMPANY_BASE = "/api/data-entry/company";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumberOrZero(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableDate(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function isNanLike(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).toLowerCase();
  return s === "nan" || s === "null" || s === "undefined" || s === "";
}

function toEmptyIfNan(value: string | null | undefined): string {
  const s = String(value ?? "").trim();
  return isNanLike(s) ? "" : s;
}

function toNullIfNan<T>(value: T | string | null | undefined): T | null {
  if (value == null) return null;
  if (typeof value === "string" && isNanLike(value)) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value as T;
}

import type { CompanyFormLabelOverrides } from "@/app/admin/data-entry/_components/CompanyProfileForm";

async function fetchCompanyById(
  id: number,
  token: string
): Promise<{ data: CompanyFormData; labelOverrides: CompanyFormLabelOverrides }> {
  const url = `${NEW_COMPANY_BASE}/${id}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error || err?.message || `Failed to fetch company (${res.status})`
    );
  }

  const raw = await res.json();

  const sectors_id = (raw.sectors_id ?? []) as number[];
  const primarySectorIds = new Set(sectors_id);

  const locationLabel =
    [raw.location_country, raw.location_state, raw.location_city]
      .filter(Boolean)
      .join(", ") || undefined;

  const labelOverrides: CompanyFormLabelOverrides = {
    ownership:
      raw.ownership_type_label && raw.ownership_type_id != null
        ? { [raw.ownership_type_id]: raw.ownership_type_label }
        : undefined,
    location: locationLabel,
    revenuesCurrency:
      raw.revenues?.revenues_currency_label != null &&
      raw.revenues?.revenues_currency != null
        ? { [raw.revenues.revenues_currency]: raw.revenues.revenues_currency_label }
        : undefined,
    revenuesYear:
      raw.revenues?.year_label != null && raw.revenues?.years_id != null
        ? { [raw.revenues.years_id]: raw.revenues.year_label }
        : undefined,
    evCurrency:
      raw.ev_data?.ev_currency_label != null &&
      raw.ev_data?.ev_currency != null
        ? { [raw.ev_data.ev_currency]: raw.ev_data.ev_currency_label }
        : undefined,
    evYear:
      raw.ev_data?.ev_year != null
        ? { [raw.ev_data.ev_year]: String(raw.ev_data.ev_year) }
        : undefined,
  };

  const record = {
    ...raw,
    street_address: toEmptyIfNan(raw.street_address),
    investment: {
      last_investment_amount: toEmptyIfNan(
        raw.investment?.last_investment_amount
      ),
      last_investment_currency: toNullIfNan(
        raw.investment?.last_investment_currency
      ),
      last_investment_date: toNullableDate(
        raw.investment?.last_investment_date
      ),
      last_investment_source: toEmptyIfNan(
        raw.investment?.last_investment_source
      ),
    },
    EBITDA: {
      EBITDA_m: toEmptyIfNan(raw.EBITDA?.EBITDA_m),
      EBITDA_source: toEmptyIfNan(raw.EBITDA?.EBITDA_source),
      EBITDA_currency: toNullIfNan(raw.EBITDA?.EBITDA_currency),
      EBITDA_year: toNullIfNan(raw.EBITDA?.EBITDA_year),
    },
    revenues: raw.revenues
      ? {
          revenues_m: toEmptyIfNan(raw.revenues.revenues_m),
          rev_source: toEmptyIfNan(raw.revenues.rev_source),
          revenues_currency: toNullIfNan(raw.revenues.revenues_currency),
          years_id: toNullIfNan(raw.revenues.years_id),
        }
      : undefined,
    ev_data: raw.ev_data
      ? {
          ev_value: toEmptyIfNan(raw.ev_data.ev_value),
          ev_currency: toNullIfNan(raw.ev_data.ev_currency),
          ev_year: toNullIfNan(raw.ev_data.ev_year),
          ev_source: toEmptyIfNan(raw.ev_data.ev_source),
        }
      : undefined,
    linkedin_data: {
      LinkedIn_URL: raw.linkedin_data?.LinkedIn_URL ?? "",
      LinkedIn_Employee: toNullIfNan(raw.linkedin_data?.LinkedIn_Employee),
      LinkedIn_Emp__Date:
        toNullableDate(raw.linkedin_data?.LinkedIn_Emp__Date) ?? "",
      linkedin_logo: raw.linkedin_data?.linkedin_logo ?? "",
    },
  };

  return {
    data: fromApiRecord(record, primarySectorIds),
    labelOverrides,
  };
}

function buildNewCompanyPayload(payload: CompanyFormPayload) {
  const typedPayload = payload as CompanyFormPayload & Partial<CompanyFormData>;

  return {
    name: typedPayload.name || "",
    locations_id: toNumberOrZero(typedPayload.locations_id),
    url: typedPayload.url || "",
    primary_business_focus_id: typedPayload.primary_business_focus_id || [],
    sectors_id: typedPayload.sectors_id || [],
    horizontals_id: typedPayload.horizontals_id || [],
    description: typedPayload.description || "",
    Product_Type: typedPayload.Product_Type || [],
    Data_Collection_Method: typedPayload.Data_Collection_Method || [],
    Revenue_Model: typedPayload.Revenue_Model || [],
    street_address: typedPayload.street_address || "",
    ownership_type_id: toNumberOrZero(typedPayload.ownership_type_id),
    linkedin_data: {
      LinkedIn_URL: typedPayload.linkedin_data?.LinkedIn_URL || "",
      LinkedIn_Employee: toNumberOrZero(
        typedPayload.linkedin_data?.LinkedIn_Employee
      ),
      LinkedIn_Emp__Date: toNullableDate(
        typedPayload.linkedin_data?.LinkedIn_Emp__Date
      ),
      linkedin_logo: typedPayload.linkedin_data?.linkedin_logo || "",
    },
    year_founded: toNumberOrZero(typedPayload.year_founded),
    investors_new_company: typedPayload.investors_new_company || [],
    investment: {
      last_investment_amount:
        typedPayload.investment?.last_investment_amount || "",
      last_investment_currency: toNumberOrZero(
        typedPayload.investment?.last_investment_currency
      ),
      last_investment_date: toNullableDate(
        typedPayload.investment?.last_investment_date
      ),
      last_investment_source:
        typedPayload.investment?.last_investment_source || "",
    },
    revenues: {
      revenues_m: typedPayload.revenues?.revenues_m || "",
      rev_source: typedPayload.revenues?.rev_source || "",
      revenues_currency: toNumberOrZero(
        typedPayload.revenues?.revenues_currency
      ),
      years_id: toNumberOrZero(typedPayload.revenues?.years_id),
    },
    ev_data: {
      ev_value: typedPayload.ev_data?.ev_value || "",
      ev_currency: toNumberOrZero(typedPayload.ev_data?.ev_currency),
      ev_year: toNumberOrZero(typedPayload.ev_data?.ev_year),
      ev_source: typedPayload.ev_data?.ev_source || "",
    },
    EBITDA: {
      EBITDA_m: typedPayload.EBITDA?.EBITDA_m || "",
      EBITDA_source: typedPayload.EBITDA?.EBITDA_source || "",
      EBITDA_currency: toNumberOrZero(typedPayload.EBITDA?.EBITDA_currency),
      EBITDA_year: toNumberOrZero(typedPayload.EBITDA?.EBITDA_year),
    },
    webpage_monitored: typedPayload.webpage_monitored || "",
    company_id: typedPayload.company_id || "",
    da_ready: !!typedPayload.da_ready,
    source_id: toNumberOrZero(typedPayload.source_id),
    company_name_alias: typedPayload.company_name_alias || [],
    company_legal_name: typedPayload.company_legal_name || "",
    last_updated_at: getTodayIsoDate(),
    description_enriched: "",
    description_metadata_raw: "",
    unique_website: !!typedPayload.unique_website,
    unique_domain: !!typedPayload.unique_domain,
    expired_domain: !!typedPayload.expired_domain,
    company_logo: typedPayload.company_logo || "",
    industry: typedPayload.industry || "",
    type: typedPayload.type || "",
    status_value: typedPayload.status_value || "",
    status_comment: typedPayload.status_comment || "",
    size_range: typedPayload.size_range || "",
    ownership_status: typedPayload.ownership_status || "",
    employees_count: toNumberOrZero(typedPayload.employees_count),
    Former_name: typedPayload.Former_name || [],
    followers_count_linkedin: toNumberOrZero(
      typedPayload.followers_count_linkedin
    ),
    followers_count_twitter: toNumberOrZero(
      typedPayload.followers_count_twitter
    ),
    followers_count_owler: toNumberOrZero(typedPayload.followers_count_owler),
    total_website_visits_monthly: toNumberOrZero(
      typedPayload.total_website_visits_monthly
    ),
    visits_change_monthly: toNumberOrZero(typedPayload.visits_change_monthly),
    rank_global: toNumberOrZero(typedPayload.rank_global),
    rank_country: toNumberOrZero(typedPayload.rank_country),
    rank_category: toNumberOrZero(typedPayload.rank_category),
    bounce_rate: toNumberOrZero(typedPayload.bounce_rate),
    pages_per_visit: toNumberOrZero(typedPayload.pages_per_visit),
    average_visit_duration_seconds: toNumberOrZero(
      typedPayload.average_visit_duration_seconds
    ),
    linkedin_url_cloude_processed: !!typedPayload.linkedin_url_cloude_processed,
    linkedin_log: typedPayload.linkedin_log || "",
    linkedin_growth_1y_pct: toNumberOrZero(typedPayload.linkedin_growth_1y_pct),
  };
}

function getTokenStatus(token: string | null): string {
  if (!token) return "";

  try {
    const claims: JWTPayload = decodeJwt(token);
    const rawStatus =
      (claims as Record<string, unknown>).status ??
      (claims as Record<string, unknown>).Status ??
      (claims as Record<string, unknown>).role;

    return typeof rawStatus === "string" ? rawStatus : "";
  } catch {
    return "";
  }
}

function DataEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [initialFormData, setInitialFormData] = useState<CompanyFormData | null>(
    null
  );
  const [labelOverrides, setLabelOverrides] =
    useState<CompanyFormLabelOverrides | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadCompanyError, setLoadCompanyError] = useState<string | null>(null);
  const [loadIdInput, setLoadIdInput] = useState("");

  const isAdmin = useMemo(() => {
    const tokenStatus = getTokenStatus(authService.getToken()).toLowerCase();
    const userStatus = String(
      user?.Status ?? user?.status ?? user?.role ?? ""
    ).toLowerCase();
    const roles = (user?.roles ?? []).map((role) => String(role).toLowerCase());

    return (
      tokenStatus === "admin" ||
      userStatus === "admin" ||
      roles.includes("admin")
    );
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, loading, router]);

  const loadCompanyById = useCallback(
    async (id: number) => {
      const token = authService.getToken();
      if (!token) {
        toast.error("Authentication required.");
        router.replace("/login");
        return;
      }
      setLoadingCompany(true);
      setLoadCompanyError(null);
      try {
        const { data, labelOverrides: overrides } = await fetchCompanyById(
          id,
          token
        );
        setInitialFormData(data);
        setLabelOverrides(overrides);
        setEditingCompanyId(id);
        setIsCreateModalOpen(true);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load company.";
        setLoadCompanyError(msg);
        toast.error(msg);
      } finally {
        setLoadingCompany(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !isAuthenticated || !isAdmin) return;
    const id = parseInt(editId, 10);
    if (!Number.isNaN(id) && id > 0) {
      loadCompanyById(id);
    }
  }, [searchParams, isAuthenticated, isAdmin, loadCompanyById]);

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>{loading ? "Loading..." : "Access denied."}</div>
      </div>
    );
  }

  const handleCreateSave = async (payload: CompanyFormPayload) => {
    try {
      const token = authService.getToken();
      if (!token) {
        toast.error("Authentication required.");
        router.replace("/login");
        return;
      }

      const requestPayload = buildNewCompanyPayload(payload);
      const isEdit = editingCompanyId != null;
      const url = isEdit
        ? `${NEW_COMPANY_BASE}/${editingCompanyId}`
        : NEW_COMPANY_BASE;
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "same-origin",
        body: JSON.stringify(requestPayload),
      });

      const responseData = await response
        .json()
        .catch(() => ({ error: "Invalid server response" }));

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            responseData?.message ||
            (isEdit ? "Failed to update company." : "Failed to create company.")
        );
      }

      toast.success(
        isEdit ? "Company updated successfully." : "Company created successfully."
      );
      setIsCreateModalOpen(false);
      setEditingCompanyId(null);
      setInitialFormData(null);
      setLabelOverrides(null);
    } catch (error) {
      console.error("Failed to save company:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save company."
      );
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCompanyId(null);
    setInitialFormData(null);
    setLabelOverrides(null);
    setLoadCompanyError(null);
  };

  const handleLoadCompany = () => {
    const id = parseInt(loadIdInput.trim(), 10);
    if (Number.isNaN(id) || id <= 0) {
      toast.error("Enter a valid company ID.");
      return;
    }
    loadCompanyById(id);
  };

  return (
    <>
      <CompaniesEditContext.Provider value={loadCompanyById}>
        <CompaniesPage />
      </CompaniesEditContext.Provider>

      <div className="fixed top-24 right-6 z-40 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <input
            type="number"
            placeholder="Company ID"
            value={loadIdInput}
            onChange={(e) => setLoadIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadCompany()}
            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button
            type="button"
            onClick={handleLoadCompany}
            disabled={loadingCompany}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            {loadingCompany ? "Loading…" : "Load"}
          </button>
        </div>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700"
          onClick={() => {
            setEditingCompanyId(null);
            setInitialFormData(null);
            setLoadCompanyError(null);
            setIsCreateModalOpen(true);
          }}
        >
          Add New Company
        </button>
      </div>

      {loadCompanyError && (
        <div className="fixed top-36 right-6 z-40 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg shadow">
          {loadCompanyError}
        </div>
      )}

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editingCompanyId ? "Edit company" : "Create company"}
          onClick={handleCloseModal}
        >
          <div
            className="flex flex-col my-auto w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingCompanyId ? "Edit Company" : "Create Company"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingCompanyId
                    ? `Editing company ID ${editingCompanyId}`
                    : "New company profile form for the data-entry workflow."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-gray-50">
              <CompanyProfileForm
                key={editingCompanyId ?? "new"}
                initialData={initialFormData ?? undefined}
                labelOverrides={labelOverrides ?? undefined}
                onSave={handleCreateSave}
                onDiscard={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DataEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div>Loading...</div>
        </div>
      }
    >
      <DataEntryContent />
    </Suspense>
  );
}
