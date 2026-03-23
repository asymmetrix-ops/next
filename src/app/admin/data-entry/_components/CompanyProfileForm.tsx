"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";

type ProductType = {
  Product_Type: string;
  pc_of_revenues: string;
};

type DataCollectionMethod = {
  Data_Collection_Method: string;
  Predominance: string;
};

type RevenueModelItem = {
  Revenue_Model_: string;
  Predominance: string;
};

type LinkedInData = {
  LinkedIn_URL: string;
  LinkedIn_Employee: number | null;
  LinkedIn_Emp__Date: string;
  linkedin_logo: string;
};

type Investment = {
  last_investment_amount: string;
  last_investment_currency: number | null;
  last_investment_date: string;
  last_investment_source: string;
};

type Revenues = {
  revenues_m: string;
  rev_source: string;
  revenues_currency: number | null;
  years_id: number | null;
};

type EvData = {
  ev_value: string;
  ev_currency: number | null;
  ev_year: number | null;
  ev_source: string;
};

type Ebitda = {
  EBITDA_m: string;
  EBITDA_source: string;
  EBITDA_currency: number | null;
  EBITDA_year: number | null;
};

export type CompanyFormData = {
  name: string;
  company_legal_name: string;
  company_name_alias: string[];
  Former_name: string[];
  description: string;
  url: string;
  company_logo: string;
  da_ready: boolean;
  status_value: string;
  status_comment: string;
  type: string;
  industry: string;
  source_id: number | null;
  locations_id: number | null;
  street_address: string;
  primary_business_focus_id: number[];
  sectors_id_primary: number[];
  sectors_id_secondary: number[];
  horizontals_id: number[];
  ownership_type_id: number | null;
  ownership_status: string;
  size_range: string;
  year_founded: number | null;
  employees_count: number | null;
  webpage_monitored: string;
  Product_Type: ProductType[];
  Data_Collection_Method: DataCollectionMethod[];
  Revenue_Model: RevenueModelItem[];
  linkedin_data: LinkedInData;
  linkedin_url_cloude_processed: boolean;
  linkedin_log: string;
  linkedin_growth_1y_pct: number | null;
  followers_count_linkedin: number | null;
  followers_count_twitter: number | null;
  followers_count_owler: number | null;
  total_website_visits_monthly: number | null;
  visits_change_monthly: number | null;
  rank_global: number | null;
  rank_country: number | null;
  rank_category: number | null;
  bounce_rate: number | null;
  pages_per_visit: number | null;
  average_visit_duration_seconds: number | null;
  unique_website: boolean;
  unique_domain: boolean;
  expired_domain: boolean;
  company_id: string;
  investment: Investment;
  revenues: Revenues;
  ev_data: EvData;
  EBITDA: Ebitda;
  investors_new_company: number[];
};

export function toApiPayload(data: CompanyFormData) {
  const { sectors_id_primary, sectors_id_secondary, ...rest } = data;
  return { ...rest, sectors_id: [...sectors_id_primary, ...sectors_id_secondary] };
}

export type CompanyFormPayload = ReturnType<typeof toApiPayload>;

export function fromApiRecord(
  record: Partial<CompanyFormData> & { sectors_id?: number[] },
  primarySectorIds: Set<number> = new Set()
): CompanyFormData {
  const { sectors_id = [], ...rest } = record;
  return {
    ...EMPTY,
    ...rest,
    sectors_id_primary: sectors_id.filter((id) => primarySectorIds.has(id)),
    sectors_id_secondary: sectors_id.filter((id) => !primarySectorIds.has(id)),
  };
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "location", label: "Location" },
  { id: "classification", label: "Classification" },
  { id: "business", label: "Business" },
  { id: "online", label: "Online presence" },
  { id: "financial", label: "Financials" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const REVENUE_MODEL_OPTIONS = [
  "Subscription",
  "Consumption-based/Usage-based",
  "Transaction Fees",
  "Freemium",
  "Consulting",
  "Advertising",
  "Sponsorship",
];

const DATA_COLLECTION_OPTIONS = [
  "Crowd Sourced",
  "Customer Data",
  "Data Co-op",
  "Data Exhaust",
  "Give-to-Get/Contributory",
  "Manual",
  "Public Filings/Government Data",
  "Purchased Data",
  "Satellite Data",
  "Sensor / IoT Data",
  "Surveys",
  "Transaction-Generated",
  "Web Scraping",
];

const PREDOMINANCE_OPTIONS = ["Primary", "Secondary", "Tertiary"];
const SIZE_RANGE_OPTIONS = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1000",
  "1001–5000",
  "5000+",
];
const STATUS_OPTIONS = ["Active", "Acquired", "Merged", "Defunct", "Unknown"];

type LabeledIdOption = {
  id: number;
  label: string;
};

function FL({
  children,
  hint,
  required,
}: {
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex gap-1.5 items-baseline mb-1.5 text-[12px] font-medium text-[color:var(--color-text-primary)]">
      {children}
      {required && <span className="text-[10px] text-red-400">required</span>}
      {hint && (
        <span className="text-[11px] font-normal text-[color:var(--color-text-tertiary)]">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full h-9 px-3 text-[13px] border border-[color:var(--color-border-secondary)] rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus:outline-none focus:border-[color:var(--color-border-primary)] transition-colors";

function TI({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number | null;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function TA({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} h-auto py-2.5 resize-none leading-relaxed`}
    />
  );
}

function SI({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex gap-3 items-start w-full text-left group"
    >
      <div
        className={`relative mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
          checked
            ? "bg-emerald-500"
            : "bg-[color:var(--color-border-secondary)]"
        }`}
      >
        <div
          className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white transition-transform shadow-sm ${
            checked ? "translate-x-[19px]" : "translate-x-[3px]"
          }`}
        />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--color-text-tertiary)]">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [inp, setInp] = useState("");

  const add = () => {
    const v = inp.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInp("");
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 min-h-9 rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)]">
      {values.map((v, i) => (
        <span
          key={i}
          className="flex gap-1 items-center px-2.5 py-0.5 text-[12px] font-medium rounded-md bg-[color:var(--color-background-info)] text-[color:var(--color-text-info)]"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="ml-0.5 leading-none opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={inp}
        onChange={(e) => setInp(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] text-[13px] bg-transparent outline-none text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)]"
      />
    </div>
  );
}

function IdInput({
  values,
  onChange,
  placeholder,
  color = "info",
}: {
  values: number[];
  onChange: (v: number[]) => void;
  placeholder?: string;
  color?: "info" | "success" | "warning";
}) {
  const [inp, setInp] = useState("");

  const add = () => {
    const n = parseInt(inp.trim(), 10);
    if (!isNaN(n) && !values.includes(n)) onChange([...values, n]);
    setInp("");
  };

  const cls = {
    info: "bg-[color:var(--color-background-info)] text-[color:var(--color-text-info)]",
    success:
      "bg-[color:var(--color-background-success)] text-[color:var(--color-text-success)]",
    warning:
      "bg-[color:var(--color-background-warning)] text-[color:var(--color-text-warning)]",
  }[color];

  return (
    <div className="flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 min-h-9 rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)]">
      {values.map((v, i) => (
        <span
          key={i}
          className={`flex gap-1 items-center px-2.5 py-0.5 text-[12px] font-medium rounded-md ${cls}`}
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="ml-0.5 leading-none opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={inp}
        onChange={(e) => setInp(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        type="number"
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] text-[13px] bg-transparent outline-none text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)]"
      />
    </div>
  );
}

function Sec({ title, description }: { title: string; description?: string }) {
  return (
    <div className="first:mt-0 mt-6 mb-3">
      <p className="text-[12px] font-medium text-[color:var(--color-text-primary)]">
        {title}
      </p>
      {description && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--color-text-tertiary)]">
          {description}
        </p>
      )}
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="px-3.5 py-3 mb-4 text-[12px] leading-relaxed rounded-lg border text-[color:var(--color-text-secondary)] border-[color:var(--color-border-tertiary)] bg-[color:var(--color-background-secondary)]">
      {children}
    </div>
  );
}

function Div() {
  return <div className="my-5 h-px bg-[color:var(--color-border-tertiary)]" />;
}

const searchableSelectStyle = {
  width: "100%",
};

function SingleSearchSelect({
  value,
  onChange,
  options,
  placeholder,
  loading = false,
  labelOverrides,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: LabeledIdOption[];
  placeholder: string;
  loading?: boolean;
  labelOverrides?: Record<number, string>;
}) {
  const mergedOptions = useMemo(() => {
    const byId = new Map<number, string>();
    options.forEach((o) => byId.set(o.id, o.label));
    if (labelOverrides) {
      Object.entries(labelOverrides).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    return Array.from(byId.entries(), ([id, label]) => ({ id, label }));
  }, [options, labelOverrides]);

  return (
    <SearchableSelect
      options={mergedOptions.map((o) => ({
        value: o.id,
        label: o.label,
      }))}
      value={value ?? ""}
      onChange={(next) => {
        const parsed =
          typeof next === "number" ? next : Number.parseInt(String(next), 10);
        onChange(Number.isFinite(parsed) ? parsed : null);
      }}
      placeholder={placeholder}
      loading={loading}
      style={searchableSelectStyle}
    />
  );
}

function MultiSearchSelect({
  values,
  onChange,
  options,
  placeholder,
  loading = false,
  noOptionsText,
  labelOverrides,
}: {
  values: number[];
  onChange: (v: number[]) => void;
  options: LabeledIdOption[];
  placeholder: string;
  loading?: boolean;
  noOptionsText?: string;
  labelOverrides?: Record<number, string>;
}) {
  const mergedOptions = useMemo(() => {
    const byId = new Map<number, string>();
    options.forEach((o) => byId.set(o.id, o.label));
    if (labelOverrides) {
      Object.entries(labelOverrides).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    return Array.from(byId.entries(), ([id, label]) => ({ id, label }));
  }, [options, labelOverrides]);

  const availableOptions = useMemo(
    () => mergedOptions.filter((option) => !values.includes(option.id)),
    [mergedOptions, values]
  );

  const selectedOptions = useMemo(
    () =>
      values.map((id) => ({
        id,
        label:
          mergedOptions.find((option) => option.id === id)?.label ?? `ID ${id}`,
      })),
    [mergedOptions, values]
  );

  return (
    <div className="space-y-2">
      <SearchableSelect
        options={availableOptions.map((o) => ({
          value: o.id,
          label: o.label,
        }))}
        value=""
        onChange={(next) => {
          const parsed =
            typeof next === "number" ? next : Number.parseInt(String(next), 10);
          if (Number.isFinite(parsed) && !values.includes(parsed)) {
            onChange([...values, parsed]);
          }
        }}
        placeholder={placeholder}
        loading={loading}
        noOptionsText={noOptionsText}
        style={searchableSelectStyle}
      />

      <div className="flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 min-h-9 rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)]">
        {selectedOptions.length === 0 && (
          <span className="text-[12px] text-[color:var(--color-text-tertiary)]">
            No selections yet
          </span>
        )}
        {selectedOptions.map((option) => (
          <span
            key={option.id}
            className="flex gap-1 items-center px-2.5 py-0.5 text-[12px] font-medium rounded-md bg-[color:var(--color-background-info)] text-[color:var(--color-text-info)]"
          >
            {option.label}
            <button
              type="button"
              onClick={() =>
                onChange(values.filter((value) => value !== option.id))
              }
              className="ml-0.5 leading-none opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function RepeatableRows<T extends Record<string, string>>({
  values,
  onChange,
  addLabel,
  fields,
}: {
  values: T[];
  onChange: (v: T[]) => void;
  addLabel: string;
  fields: {
    key: keyof T;
    label: string;
    hint?: string;
    options?: string[];
    placeholder?: string;
  }[];
}) {
  const empty = Object.fromEntries(fields.map((f) => [f.key, ""])) as T;

  return (
    <div className="space-y-2">
      {values.map((row, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-[color:var(--color-border-tertiary)] bg-[color:var(--color-background-primary)]"
        >
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}
          >
            {fields.map((f) => (
              <div key={String(f.key)}>
                <FL hint={f.hint}>{f.label}</FL>
                {f.options ? (
                  <SI
                    value={String(row[f.key])}
                    onChange={(v) =>
                      onChange(
                        values.map((r, j) =>
                          j === i ? { ...r, [f.key]: v } : r
                        )
                      )
                    }
                    options={f.options}
                    placeholder="Select…"
                  />
                ) : (
                  <TI
                    value={String(row[f.key])}
                    onChange={(v) =>
                      onChange(
                        values.map((r, j) =>
                          j === i ? { ...r, [f.key]: v } : r
                        )
                      )
                    }
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="mt-2.5 text-[11px] text-[color:var(--color-text-tertiary)] transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, { ...empty }])}
        className="w-full h-9 text-[12px] rounded-lg border border-dashed transition-colors text-[color:var(--color-text-secondary)] border-[color:var(--color-border-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-background-secondary)]"
      >
        + {addLabel}
      </button>
    </div>
  );
}

function useCompanyFormReferenceData(primarySectorIds: number[]) {
  const [primarySectors, setPrimarySectors] = useState<LabeledIdOption[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<LabeledIdOption[]>([]);
  const [businessFocuses, setBusinessFocuses] = useState<LabeledIdOption[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<LabeledIdOption[]>([]);
  const [currencies, setCurrencies] = useState<LabeledIdOption[]>([]);
  const [yearIds, setYearIds] = useState<LabeledIdOption[]>([]);
  const [yearValues, setYearValues] = useState<LabeledIdOption[]>([]);
  const [locations, setLocations] = useState<LabeledIdOption[]>([]);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  const [loadingBusinessFocuses, setLoadingBusinessFocuses] = useState(false);
  const [loadingOwnershipTypes, setLoadingOwnershipTypes] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadReferenceData = async () => {
      setLoadingPrimarySectors(true);
      setLoadingBusinessFocuses(true);
      setLoadingOwnershipTypes(true);
      setLoadingCurrencies(true);
      setLoadingYears(true);
      setLoadingLocations(true);
      setReferenceError(null);

      const [primaryRes, focusRes, ownershipRes, currencyRes, yearsRes, locRes] =
        await Promise.allSettled([
        locationsService.getPrimarySectors(),
        locationsService.getHybridBusinessFocuses(),
        locationsService.getOwnershipTypes(),
        locationsService.getCurrencies(),
        locationsService.getYears(),
        locationsService.getLocations(),
      ]);

      if (!mounted) return;

      if (primaryRes.status === "fulfilled") {
        setPrimarySectors(
          primaryRes.value.map((sector) => ({
            id: sector.id,
            label: sector.sector_name,
          }))
        );
      } else {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
      }

      if (focusRes.status === "fulfilled") {
        setBusinessFocuses(
          focusRes.value.map((focus) => ({
            id: focus.id,
            label: focus.business_focus,
          }))
        );
      } else {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
      }

      if (ownershipRes.status === "fulfilled") {
        setOwnershipTypes(
          ownershipRes.value.map((ownership) => ({
            id: ownership.id,
            label: ownership.ownership,
          }))
        );
      } else {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
      }

      if (currencyRes.status === "fulfilled") {
        setCurrencies(
          currencyRes.value.map((currency) => ({
            id: currency.id,
            label: currency.Currency,
          }))
        );
      } else {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
      }

      if (locRes.status === "fulfilled") {
        setLocations(
          locRes.value.map((loc) => ({
            id: loc.id,
            label: loc.label,
          }))
        );
      }

      if (yearsRes.status === "fulfilled") {
        const normalizedYears = yearsRes.value
          .map((year) => {
            const yearValue = Number.parseInt(String(year.Year), 10);
            if (!Number.isFinite(yearValue)) return null;
            return {
              id: year.id,
              label: String(year.Year),
              value: yearValue,
            };
          })
          .filter(
            (
              year
            ): year is { id: number; label: string; value: number } =>
              year !== null
          );

        setYearIds(
          normalizedYears.map((year) => ({
            id: year.id,
            label: year.label,
          }))
        );

        setYearValues(
          normalizedYears.map((year) => ({
            id: year.value,
            label: year.label,
          }))
        );
      } else {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
      }

      setLoadingPrimarySectors(false);
      setLoadingBusinessFocuses(false);
      setLoadingOwnershipTypes(false);
      setLoadingCurrencies(false);
      setLoadingYears(false);
      setLoadingLocations(false);
    };

    loadReferenceData().catch((error) => {
      console.error("Failed to load company form reference data:", error);
      if (mounted) {
        setReferenceError(
          "Some shared dropdown options could not be loaded from the existing app data."
        );
        setLoadingPrimarySectors(false);
        setLoadingBusinessFocuses(false);
        setLoadingOwnershipTypes(false);
        setLoadingCurrencies(false);
        setLoadingYears(false);
        setLoadingLocations(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSecondarySectors = async () => {
      setLoadingSecondarySectors(true);
      try {
        const result =
          primarySectorIds.length > 0
            ? await locationsService.getSecondarySectors(primarySectorIds)
            : await locationsService.getAllSecondarySectors();

        if (!mounted) return;

        setSecondarySectors(
          result.map((sector) => ({
            id: sector.id,
            label: sector.sector_name,
          }))
        );
      } catch (error) {
        console.error("Failed to load secondary sectors:", error);
        if (mounted) {
          setReferenceError(
            "Some shared dropdown options could not be loaded from the existing app data."
          );
        }
      } finally {
        if (mounted) {
          setLoadingSecondarySectors(false);
        }
      }
    };

    loadSecondarySectors();

    return () => {
      mounted = false;
    };
  }, [primarySectorIds]);

  return {
    primarySectors,
    secondarySectors,
    businessFocuses,
    ownershipTypes,
    currencies,
    yearIds,
    yearValues,
    locations,
    loadingPrimarySectors,
    loadingSecondarySectors,
    loadingBusinessFocuses,
    loadingOwnershipTypes,
    loadingCurrencies,
    loadingYears,
    loadingLocations,
    referenceError,
  };
}

type SetFn = (k: keyof CompanyFormData, v: unknown) => void;

function OverviewTab({ data, set }: { data: CompanyFormData; set: SetFn }) {
  return (
    <div>
      <Sec
        title="Company name"
        description="The primary name used across the platform. Add any alternative spellings or known aliases below."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL required>Company name</FL>
          <TI
            value={data.name}
            onChange={(v) => set("name", v)}
            placeholder="e.g. Asymmetrix Intelligence"
          />
        </div>
        <div>
          <FL hint="legal entity name">Legal name</FL>
          <TI
            value={data.company_legal_name}
            onChange={(v) => set("company_legal_name", v)}
            placeholder="e.g. Asymmetrix Intelligence Ltd."
          />
        </div>
        <div>
          <FL hint="other names the company goes by">Known aliases</FL>
          <TagInput
            values={data.company_name_alias}
            onChange={(v) => set("company_name_alias", v)}
            placeholder="Type an alias, press Enter to add"
          />
        </div>
        <div>
          <FL hint="previous company names">Former names</FL>
          <TagInput
            values={data.Former_name}
            onChange={(v) => set("Former_name", v)}
            placeholder="Type a former name, press Enter to add"
          />
        </div>
      </div>

      <Sec
        title="Description"
        description="A concise summary of what the company does, who they serve, and what makes them distinctive in the data & analytics market."
      />
      <FL>About this company</FL>
      <TA
        value={data.description}
        onChange={(v) => set("description", v)}
        placeholder="What does the company do? Who are their customers? What data or analytics products do they offer?"
        rows={5}
      />

      <Sec title="Web presence" />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL>Website</FL>
          <TI value={data.url} onChange={(v) => set("url", v)} placeholder="https://" />
        </div>
        <div>
          <FL hint="direct URL to company logo image">Logo URL</FL>
          <TI
            value={data.company_logo}
            onChange={(v) => set("company_logo", v)}
            placeholder="https://…"
          />
        </div>
      </div>

      <Sec title="Status & classification" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FL>Company status</FL>
          <SI
            value={data.status_value}
            onChange={(v) => set("status_value", v)}
            options={STATUS_OPTIONS}
            placeholder="Select…"
          />
        </div>
        <div>
          <FL hint="any context on the current status">Status note</FL>
          <TI
            value={data.status_comment}
            onChange={(v) => set("status_comment", v)}
            placeholder="e.g. Rebranded in 2024"
          />
        </div>
        <div>
          <FL hint="e.g. Private, Public, PE-backed">Company type</FL>
          <TI
            value={data.type}
            onChange={(v) => set("type", v)}
            placeholder="e.g. Private"
          />
        </div>
        <div>
          <FL hint="broad industry vertical">Industry</FL>
          <TI
            value={data.industry}
            onChange={(v) => set("industry", v)}
            placeholder="e.g. Financial Technology"
          />
        </div>
      </div>

      <Div />
      <Toggle
        checked={data.da_ready}
        onChange={(v) => set("da_ready", v)}
        label="Data & Analytics company"
        description="Flag this company as part of the D&A universe. Only flagged companies appear in sector filters and D&A-specific reports."
      />
    </div>
  );
}

function LocationTab({
  data,
  set,
  locationOptions,
  loadingLocations,
  locationLabelOverride,
}: {
  data: CompanyFormData;
  set: SetFn;
  locationOptions: LabeledIdOption[];
  loadingLocations: boolean;
  locationLabelOverride?: string;
}) {
  const optionsWithOverride = useMemo(() => {
    if (
      !locationLabelOverride ||
      data.locations_id == null ||
      locationOptions.some((o) => o.id === data.locations_id)
    ) {
      return locationOptions;
    }
    return [
      ...locationOptions,
      { id: data.locations_id, label: locationLabelOverride },
    ];
  }, [locationOptions, data.locations_id, locationLabelOverride]);

  return (
    <div>
      <Sec
        title="Headquarters"
        description="Where the company is primarily based. This is used for geographic filtering across the platform."
      />
      <div className="grid gap-3">
        <div>
          <FL required hint="select from the locations database">
            Location
          </FL>
          <SingleSearchSelect
            value={data.locations_id}
            onChange={(v) => set("locations_id", v)}
            options={optionsWithOverride}
            placeholder="Search and select location"
            loading={loadingLocations}
          />
        </div>
        <div>
          <FL hint="optional, more specific than the city">Street address</FL>
          <TI
            value={data.street_address}
            onChange={(v) => set("street_address", v)}
            placeholder="e.g. 1 Canada Square, Canary Wharf, London"
          />
        </div>
      </div>
    </div>
  );
}

function ClassificationTab({
  data,
  set,
  businessFocusOptions,
  primarySectorOptions,
  secondarySectorOptions,
  ownershipTypeOptions,
  loadingBusinessFocuses,
  loadingPrimarySectors,
  loadingSecondarySectors,
  loadingOwnershipTypes,
  labelOverrides,
}: {
  data: CompanyFormData;
  set: SetFn;
  businessFocusOptions: LabeledIdOption[];
  primarySectorOptions: LabeledIdOption[];
  secondarySectorOptions: LabeledIdOption[];
  ownershipTypeOptions: LabeledIdOption[];
  loadingBusinessFocuses: boolean;
  loadingPrimarySectors: boolean;
  loadingSecondarySectors: boolean;
  loadingOwnershipTypes: boolean;
  labelOverrides?: {
    sectors?: Record<number, string>;
    businessFocus?: Record<number, string>;
    ownership?: Record<number, string>;
  };
}) {
  return (
    <div>
      <Sec
        title="Business focus"
        description="What type of business is this company? Used for high-level filtering across the platform."
      />
      <div>
        <FL hint="select from the business focus list">Business focus tags</FL>
        <MultiSearchSelect
          values={data.primary_business_focus_id}
          onChange={(v) => set("primary_business_focus_id", v)}
          options={businessFocusOptions}
          placeholder="Search and add business focus"
          loading={loadingBusinessFocuses}
          labelOverrides={labelOverrides?.businessFocus}
        />
      </div>

      <Sec
        title="Sectors"
        description="The data & analytics sectors this company operates in. Primary sectors are the main focus; secondary sectors are adjacent areas. Both are used for filtering and sector intelligence."
      />
      <div className="grid gap-3">
        <div>
          <FL>Primary sectors</FL>
          <MultiSearchSelect
            values={data.sectors_id_primary}
            onChange={(v) => set("sectors_id_primary", v)}
            options={primarySectorOptions}
            placeholder="Search and add a primary sector"
            loading={loadingPrimarySectors}
            labelOverrides={labelOverrides?.sectors}
          />
        </div>
        <div>
          <FL hint="adjacent or supporting areas">Secondary sectors</FL>
          <MultiSearchSelect
            values={data.sectors_id_secondary}
            onChange={(v) => set("sectors_id_secondary", v)}
            options={secondarySectorOptions}
            placeholder="Search and add a secondary sector"
            loading={loadingSecondarySectors}
            labelOverrides={labelOverrides?.sectors}
            noOptionsText={
              data.sectors_id_primary.length > 0
                ? "No secondary sectors found for the selected primary sectors"
                : "No secondary sectors found"
            }
          />
        </div>
      </div>

      <Sec
        title="Horizontals"
        description="Cross-sector capabilities or delivery models (e.g. SaaS, API, Consulting)."
      />
      <div>
        <FL>Horizontals</FL>
        <IdInput
          values={data.horizontals_id}
          onChange={(v) => set("horizontals_id", v)}
          placeholder="Add a horizontal ID"
          color="info"
        />
      </div>

      <Sec title="Ownership" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FL hint="select from ownership types">Ownership type</FL>
          <SingleSearchSelect
            value={data.ownership_type_id}
            onChange={(v) => set("ownership_type_id", v)}
            options={ownershipTypeOptions}
            placeholder="Search ownership type"
            loading={loadingOwnershipTypes}
            labelOverrides={labelOverrides?.ownership}
          />
        </div>
        <div>
          <FL hint="e.g. Independently owned, Subsidiary">Ownership status</FL>
          <TI
            value={data.ownership_status}
            onChange={(v) => set("ownership_status", v)}
            placeholder="e.g. Independently owned"
          />
        </div>
        <div>
          <FL>Company size</FL>
          <SI
            value={data.size_range}
            onChange={(v) => set("size_range", v)}
            options={SIZE_RANGE_OPTIONS}
            placeholder="Select headcount range…"
          />
        </div>
      </div>
    </div>
  );
}

function BusinessTab({
  data,
  set,
  yearOptions,
  loadingYears,
}: {
  data: CompanyFormData;
  set: SetFn;
  yearOptions: LabeledIdOption[];
  loadingYears: boolean;
}) {
  return (
    <div>
      <Sec title="Company details" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FL hint="year the company was established">Year founded</FL>
          <SingleSearchSelect
            value={data.year_founded}
            onChange={(v) => set("year_founded", v)}
            options={yearOptions}
            placeholder="Search year founded"
            loading={loadingYears}
          />
        </div>
        <div>
          <FL hint="current headcount">Number of employees</FL>
          <TI
            value={data.employees_count}
            onChange={(v) => set("employees_count", v ? parseInt(v, 10) : null)}
            type="number"
            placeholder="e.g. 85"
          />
        </div>
        <div>
          <FL hint="page we track for updates">Monitored webpage</FL>
          <TI
            value={data.webpage_monitored}
            onChange={(v) => set("webpage_monitored", v)}
            placeholder="https://…"
          />
        </div>
      </div>

      <Sec
        title="Revenue model"
        description="How does this company make money? Add one row per revenue stream. Use 'Predominance' to indicate which streams are primary vs secondary."
      />
      <RepeatableRows
        values={data.Revenue_Model}
        onChange={(v) => set("Revenue_Model", v)}
        addLabel="Add revenue stream"
        fields={[
          {
            key: "Revenue_Model_",
            label: "Revenue type",
            options: REVENUE_MODEL_OPTIONS,
          },
          {
            key: "Predominance",
            label: "Predominance",
            options: PREDOMINANCE_OPTIONS,
          },
        ]}
      />

      <Sec
        title="Data collection methods"
        description="How does this company collect or source its data? Add one row per method."
      />
      <RepeatableRows
        values={data.Data_Collection_Method}
        onChange={(v) => set("Data_Collection_Method", v)}
        addLabel="Add collection method"
        fields={[
          {
            key: "Data_Collection_Method",
            label: "Collection method",
            options: DATA_COLLECTION_OPTIONS,
          },
          {
            key: "Predominance",
            label: "Predominance",
            options: PREDOMINANCE_OPTIONS,
          },
        ]}
      />

      <Sec
        title="Product types"
        description="What types of products does this company offer? Optionally add the estimated % of revenues each contributes."
      />
      <RepeatableRows
        values={data.Product_Type}
        onChange={(v) => set("Product_Type", v)}
        addLabel="Add product type"
        fields={[
          {
            key: "Product_Type",
            label: "Product type",
            placeholder: "e.g. Platform, API, Reports",
          },
          {
            key: "pc_of_revenues",
            label: "% of revenues",
            placeholder: "e.g. 60%",
          },
        ]}
      />
    </div>
  );
}

function OnlineTab({ data, set }: { data: CompanyFormData; set: SetFn }) {
  const li = (k: keyof LinkedInData, v: string | number | null) =>
    set("linkedin_data", { ...data.linkedin_data, [k]: v });

  return (
    <div>
      <Sec
        title="LinkedIn"
        description="LinkedIn profile data. Employee count and date are used to track headcount growth over time."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <FL>LinkedIn profile URL</FL>
          <TI
            value={data.linkedin_data.LinkedIn_URL}
            onChange={(v) => li("LinkedIn_URL", v)}
            placeholder="https://linkedin.com/company/…"
          />
        </div>
        <div>
          <FL>LinkedIn employee count</FL>
          <TI
            value={data.linkedin_data.LinkedIn_Employee}
            onChange={(v) =>
              li("LinkedIn_Employee", v ? parseInt(v, 10) : null)
            }
            type="number"
            placeholder="e.g. 312"
          />
        </div>
        <div>
          <FL hint="date of the employee count snapshot">Count recorded on</FL>
          <TI
            value={data.linkedin_data.LinkedIn_Emp__Date}
            onChange={(v) => li("LinkedIn_Emp__Date", v)}
            type="date"
          />
        </div>
        <div>
          <FL hint="URL to the company logo from LinkedIn">LinkedIn logo URL</FL>
          <TI
            value={data.linkedin_data.linkedin_logo}
            onChange={(v) => li("linkedin_logo", v)}
            placeholder="https://…"
          />
        </div>
        <div>
          <FL hint="year-on-year LinkedIn headcount growth">
            LinkedIn headcount growth (1yr %)
          </FL>
          <TI
            value={data.linkedin_growth_1y_pct}
            onChange={(v) =>
              set("linkedin_growth_1y_pct", v ? parseFloat(v) : null)
            }
            type="number"
            placeholder="e.g. 12.4"
          />
        </div>
      </div>

      <Sec title="Social following" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FL>LinkedIn followers</FL>
          <TI
            value={data.followers_count_linkedin}
            onChange={(v) =>
              set("followers_count_linkedin", v ? parseInt(v, 10) : null)
            }
            type="number"
          />
        </div>
        <div>
          <FL>Twitter / X followers</FL>
          <TI
            value={data.followers_count_twitter}
            onChange={(v) =>
              set("followers_count_twitter", v ? parseInt(v, 10) : null)
            }
            type="number"
          />
        </div>
        <div>
          <FL>Owler followers</FL>
          <TI
            value={data.followers_count_owler}
            onChange={(v) =>
              set("followers_count_owler", v ? parseInt(v, 10) : null)
            }
            type="number"
          />
        </div>
      </div>

      <Sec
        title="Website traffic"
        description="Monthly traffic and engagement data for the company's website."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FL>Monthly visits</FL>
          <TI
            value={data.total_website_visits_monthly}
            onChange={(v) =>
              set("total_website_visits_monthly", v ? parseInt(v, 10) : null)
            }
            type="number"
          />
        </div>
        <div>
          <FL hint="vs previous month">Visit change (MoM %)</FL>
          <TI
            value={data.visits_change_monthly}
            onChange={(v) =>
              set("visits_change_monthly", v ? parseFloat(v) : null)
            }
            type="number"
          />
        </div>
        <div>
          <FL hint="position in global traffic rankings">Global traffic rank</FL>
          <TI
            value={data.rank_global}
            onChange={(v) => set("rank_global", v ? parseInt(v, 10) : null)}
            type="number"
          />
        </div>
        <div>
          <FL>Country rank</FL>
          <TI
            value={data.rank_country}
            onChange={(v) => set("rank_country", v ? parseInt(v, 10) : null)}
            type="number"
          />
        </div>
        <div>
          <FL>Category rank</FL>
          <TI
            value={data.rank_category}
            onChange={(v) => set("rank_category", v ? parseInt(v, 10) : null)}
            type="number"
          />
        </div>
        <div>
          <FL hint="% of visitors who leave without clicking">Bounce rate %</FL>
          <TI
            value={data.bounce_rate}
            onChange={(v) => set("bounce_rate", v ? parseFloat(v) : null)}
            type="number"
          />
        </div>
        <div>
          <FL>Pages per visit</FL>
          <TI
            value={data.pages_per_visit}
            onChange={(v) => set("pages_per_visit", v ? parseFloat(v) : null)}
            type="number"
          />
        </div>
        <div>
          <FL hint="in seconds">Avg. session length</FL>
          <TI
            value={data.average_visit_duration_seconds}
            onChange={(v) =>
              set(
                "average_visit_duration_seconds",
                v ? parseInt(v, 10) : null
              )
            }
            type="number"
            placeholder="seconds"
          />
        </div>
        <div>
          <FL hint="external identifier string">External company ID</FL>
          <TI
            value={data.company_id}
            onChange={(v) => set("company_id", v)}
            placeholder="e.g. crunchbase slug"
          />
        </div>
      </div>

      <Sec
        title="Domain & processing flags"
        description="Technical flags used by the data team. Toggle on only if you have verified the information."
      />
      <div className="grid gap-4">
        <Toggle
          checked={data.unique_website}
          onChange={(v) => set("unique_website", v)}
          label="Unique website"
          description="This company has its own standalone website (not a sub-page of a parent company)."
        />
        <Toggle
          checked={data.unique_domain}
          onChange={(v) => set("unique_domain", v)}
          label="Unique domain"
          description="The company's domain is exclusively used by this company."
        />
        <Toggle
          checked={data.expired_domain}
          onChange={(v) => set("expired_domain", v)}
          label="Expired domain"
          description="The company's domain has expired or is no longer active."
        />
        <Toggle
          checked={data.linkedin_url_cloude_processed}
          onChange={(v) => set("linkedin_url_cloude_processed", v)}
          label="LinkedIn URL processed"
          description="The LinkedIn URL has been validated and normalised by the automated pipeline."
        />
      </div>

      {data.linkedin_log && (
        <>
          <Sec
            title="Processing log"
            description="Internal notes from the LinkedIn data pipeline. Read-only in most cases."
          />
          <TA
            value={data.linkedin_log}
            onChange={(v) => set("linkedin_log", v)}
            rows={2}
          />
        </>
      )}
    </div>
  );
}

function FinancialTab({
  data,
  set,
  currencyOptions,
  yearIdOptions,
  loadingCurrencies,
  loadingYears,
  labelOverrides,
}: {
  data: CompanyFormData;
  set: SetFn;
  currencyOptions: LabeledIdOption[];
  yearIdOptions: LabeledIdOption[];
  loadingCurrencies: boolean;
  loadingYears: boolean;
  labelOverrides?: CompanyFormLabelOverrides;
}) {
  const mergedCurrencies = useMemo(() => {
    const byId = new Map<number, string>();
    currencyOptions.forEach((o) => byId.set(o.id, o.label));
    if (labelOverrides?.revenuesCurrency) {
      Object.entries(labelOverrides.revenuesCurrency).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    if (labelOverrides?.evCurrency) {
      Object.entries(labelOverrides.evCurrency).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    return Array.from(byId.entries(), ([id, label]) => ({ id, label }));
  }, [currencyOptions, labelOverrides?.revenuesCurrency, labelOverrides?.evCurrency]);

  const mergedYearIds = useMemo(() => {
    const byId = new Map<number, string>();
    yearIdOptions.forEach((o) => byId.set(o.id, o.label));
    if (labelOverrides?.revenuesYear) {
      Object.entries(labelOverrides.revenuesYear).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    if (labelOverrides?.evYear) {
      Object.entries(labelOverrides.evYear).forEach(([id, label]) =>
        byId.set(Number(id), label)
      );
    }
    return Array.from(byId.entries(), ([id, label]) => ({ id, label }));
  }, [yearIdOptions, labelOverrides?.revenuesYear, labelOverrides?.evYear]);
  const inv = (k: keyof Investment, v: string | number | null) =>
    set("investment", { ...data.investment, [k]: v });
  const rev = (k: keyof Revenues, v: string | number | null) =>
    set("revenues", { ...data.revenues, [k]: v });
  const ev = (k: keyof EvData, v: string | number | null) =>
    set("ev_data", { ...data.ev_data, [k]: v });
  const ebit = (k: keyof Ebitda, v: string | number | null) =>
    set("EBITDA", { ...data.EBITDA, [k]: v });

  return (
    <div>
      <Callout>
        These are high-level financial fields stored on the company record —
        useful for quick reference. For detailed annual metrics (ARR, churn, NRR,
        EBITDA margins etc.) use the <strong>Financial Metrics</strong> section.
      </Callout>

      <Sec
        title="Last funding round"
        description="The most recent investment or funding event for this company."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL hint="in millions">Amount raised (£/$/€m)</FL>
          <TI
            value={data.investment.last_investment_amount}
            onChange={(v) => inv("last_investment_amount", v)}
            placeholder="e.g. 5.2"
          />
        </div>
        <div>
          <FL hint="currency of the amount above">Currency</FL>
          <SingleSearchSelect
            value={data.investment.last_investment_currency}
            onChange={(v) => inv("last_investment_currency", v)}
            options={mergedCurrencies}
            placeholder="Search currency"
            loading={loadingCurrencies}
          />
        </div>
        <div>
          <FL>Date announced</FL>
          <TI
            value={data.investment.last_investment_date}
            onChange={(v) => inv("last_investment_date", v)}
            type="date"
          />
        </div>
        <div>
          <FL hint="where this figure came from">Source</FL>
          <TI
            value={data.investment.last_investment_source}
            onChange={(v) => inv("last_investment_source", v)}
            placeholder="e.g. Crunchbase, press release"
          />
        </div>
      </div>

      <Sec
        title="Revenue"
        description="Indicative revenue figure stored directly on the company record. For a full revenue series, use Financial Metrics."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL hint="in millions">Revenue (£/$/€m)</FL>
          <TI
            value={data.revenues.revenues_m}
            onChange={(v) => rev("revenues_m", v)}
            placeholder="e.g. 12.5"
          />
        </div>
        <div>
          <FL>Currency</FL>
          <SingleSearchSelect
            value={data.revenues.revenues_currency}
            onChange={(v) => rev("revenues_currency", v)}
            options={mergedCurrencies}
            placeholder="Search currency"
            loading={loadingCurrencies}
          />
        </div>
        <div>
          <FL hint="the financial year this figure relates to">Financial year</FL>
          <SingleSearchSelect
            value={data.revenues.years_id}
            onChange={(v) => rev("years_id", v)}
            options={mergedYearIds}
            placeholder="Search financial year"
            loading={loadingYears}
          />
        </div>
        <div>
          <FL hint="where this figure came from">Source</FL>
          <TI
            value={data.revenues.rev_source}
            onChange={(v) => rev("rev_source", v)}
            placeholder="e.g. Annual report, investor deck"
          />
        </div>
      </div>

      <Sec
        title="Enterprise value (EV)"
        description="The estimated total value of the business."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL hint="in millions">Enterprise value (£/$/€m)</FL>
          <TI
            value={data.ev_data.ev_value}
            onChange={(v) => ev("ev_value", v)}
            placeholder="e.g. 80"
          />
        </div>
        <div>
          <FL>Currency</FL>
          <SingleSearchSelect
            value={data.ev_data.ev_currency}
            onChange={(v) => ev("ev_currency", v)}
            options={mergedCurrencies}
            placeholder="Search currency"
            loading={loadingCurrencies}
          />
        </div>
        <div>
          <FL>Year</FL>
          <SingleSearchSelect
            value={data.ev_data.ev_year}
            onChange={(v) => ev("ev_year", v)}
            options={mergedYearIds}
            placeholder="Search financial year"
            loading={loadingYears}
          />
        </div>
        <div>
          <FL>Source</FL>
          <TI
            value={data.ev_data.ev_source}
            onChange={(v) => ev("ev_source", v)}
            placeholder="e.g. Deal announcement, broker note"
          />
        </div>
      </div>

      <Sec
        title="EBITDA"
        description="Earnings before interest, taxes, depreciation, and amortisation."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FL hint="in millions">EBITDA (£/$/€m)</FL>
          <TI
            value={data.EBITDA.EBITDA_m}
            onChange={(v) => ebit("EBITDA_m", v)}
            placeholder="e.g. 3.2"
          />
        </div>
        <div>
          <FL>Currency</FL>
          <SingleSearchSelect
            value={data.EBITDA.EBITDA_currency}
            onChange={(v) => ebit("EBITDA_currency", v)}
            options={mergedCurrencies}
            placeholder="Search currency"
            loading={loadingCurrencies}
          />
        </div>
        <div>
          <FL>Year</FL>
          <SingleSearchSelect
            value={data.EBITDA.EBITDA_year}
            onChange={(v) => ebit("EBITDA_year", v)}
            options={mergedYearIds}
            placeholder="Search year"
            loading={loadingYears}
          />
        </div>
        <div>
          <FL>Source</FL>
          <TI
            value={data.EBITDA.EBITDA_source}
            onChange={(v) => ebit("EBITDA_source", v)}
            placeholder="e.g. Management accounts, annual report"
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY: CompanyFormData = {
  name: "",
  company_legal_name: "",
  company_name_alias: [],
  Former_name: [],
  description: "",
  url: "",
  company_logo: "",
  da_ready: false,
  status_value: "",
  status_comment: "",
  type: "",
  industry: "",
  source_id: null,
  locations_id: null,
  street_address: "",
  primary_business_focus_id: [],
  sectors_id_primary: [],
  sectors_id_secondary: [],
  horizontals_id: [],
  ownership_type_id: null,
  ownership_status: "",
  size_range: "",
  year_founded: null,
  employees_count: null,
  webpage_monitored: "",
  Product_Type: [],
  Data_Collection_Method: [],
  Revenue_Model: [],
  linkedin_data: {
    LinkedIn_URL: "",
    LinkedIn_Employee: null,
    LinkedIn_Emp__Date: "",
    linkedin_logo: "",
  },
  linkedin_url_cloude_processed: false,
  linkedin_log: "",
  linkedin_growth_1y_pct: null,
  followers_count_linkedin: null,
  followers_count_twitter: null,
  followers_count_owler: null,
  total_website_visits_monthly: null,
  visits_change_monthly: null,
  rank_global: null,
  rank_country: null,
  rank_category: null,
  bounce_rate: null,
  pages_per_visit: null,
  average_visit_duration_seconds: null,
  unique_website: false,
  unique_domain: false,
  expired_domain: false,
  company_id: "",
  investment: {
    last_investment_amount: "",
    last_investment_currency: null,
    last_investment_date: "",
    last_investment_source: "",
  },
  revenues: {
    revenues_m: "",
    rev_source: "",
    revenues_currency: null,
    years_id: null,
  },
  ev_data: {
    ev_value: "",
    ev_currency: null,
    ev_year: null,
    ev_source: "",
  },
  EBITDA: {
    EBITDA_m: "",
    EBITDA_source: "",
    EBITDA_currency: null,
    EBITDA_year: null,
  },
  investors_new_company: [],
};

export type CompanyFormLabelOverrides = {
  ownership?: Record<number, string>;
  location?: string;
  sectors?: Record<number, string>;
  businessFocus?: Record<number, string>;
  revenuesCurrency?: Record<number, string>;
  revenuesYear?: Record<number, string>;
  evCurrency?: Record<number, string>;
  evYear?: Record<number, string>;
};

interface CompanyProfileFormProps {
  initialData?: Partial<CompanyFormData>;
  labelOverrides?: CompanyFormLabelOverrides;
  onSave: (payload: ReturnType<typeof toApiPayload>) => Promise<void>;
  onDiscard?: () => void;
  lastUpdatedAt?: string;
}

export default function CompanyProfileForm({
  initialData,
  labelOverrides: labelOverridesProp,
  onSave,
  onDiscard,
  lastUpdatedAt,
}: CompanyProfileFormProps) {
  const labelOverrides = labelOverridesProp;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [data, setData] = useState<CompanyFormData>({ ...EMPTY, ...initialData });
  const [saving, setSaving] = useState(false);
  const {
    primarySectors,
    secondarySectors,
    businessFocuses,
    ownershipTypes,
    currencies,
    yearIds,
    yearValues,
    locations,
    loadingPrimarySectors,
    loadingSecondarySectors,
    loadingBusinessFocuses,
    loadingOwnershipTypes,
    loadingCurrencies,
    loadingYears,
    loadingLocations,
    referenceError,
  } = useCompanyFormReferenceData(data.sectors_id_primary);

  const set: SetFn = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(toApiPayload(data));
    } finally {
      setSaving(false);
    }
  };

  const panels: Record<TabId, ReactNode> = {
    overview: <OverviewTab data={data} set={set} />,
    location: (
      <LocationTab
        data={data}
        set={set}
        locationOptions={locations}
        loadingLocations={loadingLocations}
        locationLabelOverride={labelOverrides?.location}
      />
    ),
    classification: (
      <ClassificationTab
        data={data}
        set={set}
        businessFocusOptions={businessFocuses}
        primarySectorOptions={primarySectors}
        secondarySectorOptions={secondarySectors}
        ownershipTypeOptions={ownershipTypes}
        loadingBusinessFocuses={loadingBusinessFocuses}
        loadingPrimarySectors={loadingPrimarySectors}
        loadingSecondarySectors={loadingSecondarySectors}
        loadingOwnershipTypes={loadingOwnershipTypes}
        labelOverrides={labelOverrides}
      />
    ),
    business: (
      <BusinessTab
        data={data}
        set={set}
        yearOptions={yearValues}
        loadingYears={loadingYears}
      />
    ),
    online: <OnlineTab data={data} set={set} />,
    financial: (
      <FinancialTab
        data={data}
        set={set}
        currencyOptions={currencies}
        yearIdOptions={yearIds}
        loadingCurrencies={loadingCurrencies}
        loadingYears={loadingYears}
        labelOverrides={labelOverrides}
      />
    ),
  };

  return (
    <div className="flex flex-col min-h-0 h-full overflow-hidden rounded-xl border border-[color:var(--color-border-tertiary)] bg-[color:var(--color-background-primary)]">
      <div className="px-5 pt-4 pb-0 border-b border-[color:var(--color-border-tertiary)]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-sm font-medium text-[color:var(--color-text-primary)]">
              {data.name || "New company"}
            </h2>
            {data.name && data.url && (
              <p className="mt-0.5 text-[11px] text-[color:var(--color-text-tertiary)]">
                {data.url}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {data.da_ready && (
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[color:var(--color-background-success)] text-[color:var(--color-text-success)]">
                D&A
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[12px] whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] font-medium"
                  : "border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-8">
        {referenceError && (
          <Callout>{referenceError}</Callout>
        )}
        {panels[activeTab]}
      </div>

      <div className="flex flex-wrap gap-3 justify-between items-center px-5 py-3.5 border-t border-[color:var(--color-border-tertiary)] bg-[color:var(--color-background-primary)]">
        <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
          {lastUpdatedAt
            ? `Last updated ${lastUpdatedAt}`
            : "New record — not yet saved"}
        </span>
        <div className="flex gap-2">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="h-8 px-4 text-[12px] rounded-lg border transition-colors border-[color:var(--color-border-secondary)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-background-secondary)]"
            >
              Discard changes
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !data.name}
            className="h-8 px-4 text-[12px] font-medium rounded-lg transition-opacity bg-[color:var(--color-text-primary)] text-[color:var(--color-background-primary)] hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
