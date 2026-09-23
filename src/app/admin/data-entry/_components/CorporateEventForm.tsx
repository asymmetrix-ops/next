"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealStatus =
  | "Completed"
  | "In Market"
  | "Not yet launched"
  | "Strategic Review"
  | "Deal Prep"
  | "In Exclusivity"
  | "";

export type DealType =
  | "Acquisition"
  | "Sale"
  | "IPO"
  | "MBO"
  | "Investment"
  | "Strategic Review"
  | "Divestment"
  | "Restructuring"
  | "Dual track"
  | "Closing"
  | "Grant"
  | "Debt financing"
  | "Bankruptcy"
  | "Reorganisation"
  | "Employee tender offer"
  | "Rebrand"
  | "Partnership"
  | "";

type InvestmentData = {
  amount: string;
  currency_id: number | null;
  funding_stage: string;
  pre_money_valuation: string;
  investor_count: number | null;
  source: string;
};

type EvData = {
  ev_value: string;
  ev_currency: number | null;
  ev_year: number | null;
  ev_source: string;
};

type DealTermsData = {
  consideration_type: string;
  cash_component: string;
  stock_component: string;
  earn_out: string;
  earn_out_details: string;
  debt_assumed: string;
  payment_terms: string;
  source: string;
};

export type CorporateEventFormData = {
  description: string;
  long_description: string;
  deal_type: DealType;
  deal_status: DealStatus;
  announcement_date: string;
  closed_date: string;
  investment_data: InvestmentData;
  ev_data: EvData;
  deal_terms_data: DealTermsData;
  True_EV_and_Revs_or_EBITDA_disclosed: boolean;
  ready_to_publish: boolean;
};

export function toApiPayload(data: CorporateEventFormData) {
  return { ...data };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "deal", label: "Deal details" },
  { id: "financials", label: "Financials" },
  { id: "publish", label: "Publishing" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const DEAL_STATUS_OPTIONS: DealStatus[] = [
  "Completed",
  "In Market",
  "Not yet launched",
  "Strategic Review",
  "Deal Prep",
  "In Exclusivity",
];

const DEAL_TYPE_OPTIONS: DealType[] = [
  "Acquisition",
  "Sale",
  "IPO",
  "MBO",
  "Investment",
  "Strategic Review",
  "Divestment",
  "Restructuring",
  "Dual track",
  "Closing",
  "Grant",
  "Debt financing",
  "Bankruptcy",
  "Reorganisation",
  "Employee tender offer",
  "Rebrand",
  "Partnership",
];

const CONSIDERATION_OPTIONS = ["Cash", "Stock", "Mixed", "Debt", "Other"];
const FUNDING_STAGE_OPTIONS = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Growth",
  "Venture Debt",
  "Private Equity",
  "Unknown",
];

const STATUS_COLORS: Record<string, string> = {
  Completed:
    "bg-[color:var(--color-background-success)] text-[color:var(--color-text-success)]",
  "In Market":
    "bg-[color:var(--color-background-info)] text-[color:var(--color-text-info)]",
  "In Exclusivity":
    "bg-[color:var(--color-background-info)] text-[color:var(--color-text-info)]",
  "Strategic Review":
    "bg-[color:var(--color-background-warning)] text-[color:var(--color-text-warning)]",
  "Deal Prep":
    "bg-[color:var(--color-background-warning)] text-[color:var(--color-text-warning)]",
  "Not yet launched":
    "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)]",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function FL({
  children,
  hint,
  required,
}: {
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-baseline gap-1.5 text-[12px] font-medium text-[color:var(--color-text-primary)] mb-1.5">
      {children}
      {required && <span className="text-red-400 text-[10px]">required</span>}
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
      className="flex items-start gap-3 group text-left w-full"
    >
      <div
        className={`relative mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
          checked ? "bg-emerald-500" : "bg-[color:var(--color-border-secondary)]"
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
          <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

function Sec({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mt-6 mb-3 first:mt-0">
      <p className="text-[12px] font-medium text-[color:var(--color-text-primary)]">
        {title}
      </p>
      {description && (
        <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-0.5 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[color:var(--color-text-secondary)] leading-relaxed border border-[color:var(--color-border-tertiary)] rounded-lg px-3.5 py-3 bg-[color:var(--color-background-secondary)] mb-4">
      {children}
    </div>
  );
}

function Div() {
  return <div className="h-px bg-[color:var(--color-border-tertiary)] my-5" />;
}

// ─── Tab: Deal details ────────────────────────────────────────────────────────

type SetFn = (k: keyof CorporateEventFormData, v: unknown) => void;

function DealTab({ data, set }: { data: CorporateEventFormData; set: SetFn }) {
  return (
    <div>
      <Sec
        title="Deal overview"
        description="A brief summary of the transaction that will appear in lists and previews."
      />
      <div>
        <FL required>Short description</FL>
        <TI
          value={data.description}
          onChange={(v) => set("description", v)}
          placeholder="e.g. Acquisition of DataCo by FinanceCorp for £45m"
        />
      </div>

      <div className="mt-3">
        <FL hint="full narrative, shown on the deal page">Long description</FL>
        <TA
          value={data.long_description}
          onChange={(v) => set("long_description", v)}
          placeholder="Provide context on the deal rationale, background, and any notable details…"
          rows={6}
        />
      </div>

      <Sec title="Deal type & status" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FL required>Deal type</FL>
          <SI
            value={data.deal_type}
            onChange={(v) => set("deal_type", v as DealType)}
            options={DEAL_TYPE_OPTIONS}
            placeholder="Select deal type…"
          />
        </div>
        <div>
          <FL required>Deal status</FL>
          <SI
            value={data.deal_status}
            onChange={(v) => set("deal_status", v as DealStatus)}
            options={DEAL_STATUS_OPTIONS}
            placeholder="Select status…"
          />
        </div>
      </div>

      {data.deal_status && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
            Preview:
          </span>
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md ${
              STATUS_COLORS[data.deal_status] ??
              "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)]"
            }`}
          >
            {data.deal_status}
          </span>
        </div>
      )}

      <Sec
        title="Dates"
        description="Announcement date is when the deal became public. Closed date is when it formally completed."
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FL required>Announcement date</FL>
          <TI
            value={data.announcement_date}
            onChange={(v) => set("announcement_date", v)}
            type="date"
          />
        </div>
        <div>
          <FL hint="leave blank if not yet completed">Closed date</FL>
          <TI
            value={data.closed_date}
            onChange={(v) => set("closed_date", v)}
            type="date"
          />
        </div>
      </div>

      {data.announcement_date &&
        data.closed_date &&
        data.closed_date < data.announcement_date && (
          <p className="mt-2 text-[11px] text-amber-500">
            Closed date is before the announcement date — please check.
          </p>
        )}
    </div>
  );
}

// ─── Tab: Financials ──────────────────────────────────────────────────────────

function FinancialsTab({
  data,
  set,
}: {
  data: CorporateEventFormData;
  set: SetFn;
}) {
  const setInv = (k: keyof InvestmentData, v: string | number | null) =>
    set("investment_data", { ...data.investment_data, [k]: v });
  const setEv = (k: keyof EvData, v: string | number | null) =>
    set("ev_data", { ...data.ev_data, [k]: v });
  const setTerms = (k: keyof DealTermsData, v: string | number | null) =>
    set("deal_terms_data", { ...data.deal_terms_data, [k]: v });

  return (
    <div>
      <Sec
        title="Investment / raise"
        description="For investment rounds, acquisitions and fundraises. Leave blank if not applicable."
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FL hint="in millions">Amount (£/$/€m)</FL>
          <TI
            value={data.investment_data.amount}
            onChange={(v) => setInv("amount", v)}
            placeholder="e.g. 45.0"
          />
        </div>
        <div>
          <FL hint="currency of the amount above">Currency</FL>
          <TI
            value={data.investment_data.currency_id}
            onChange={(v) => {
              const n = parseInt(v, 10);
              setInv("currency_id", v === "" || Number.isNaN(n) ? null : n);
            }}
            type="number"
            placeholder="Currency ID"
          />
        </div>
        <div>
          <FL hint="e.g. Series B, Growth, PE">Funding stage</FL>
          <SI
            value={data.investment_data.funding_stage}
            onChange={(v) => setInv("funding_stage", v)}
            options={FUNDING_STAGE_OPTIONS}
            placeholder="Select stage…"
          />
        </div>
        <div>
          <FL hint="in millions, if disclosed">
            Pre-money valuation (£/$/€m)
          </FL>
          <TI
            value={data.investment_data.pre_money_valuation}
            onChange={(v) => setInv("pre_money_valuation", v)}
            placeholder="e.g. 200.0"
          />
        </div>
        <div>
          <FL hint="number of investors in this round">
            Number of investors
          </FL>
          <TI
            value={data.investment_data.investor_count}
            onChange={(v) => {
              const n = parseInt(v, 10);
              setInv("investor_count", v === "" || Number.isNaN(n) ? null : n);
            }}
            type="number"
            placeholder="e.g. 3"
          />
        </div>
        <div>
          <FL hint="where this figure came from">Source</FL>
          <TI
            value={data.investment_data.source}
            onChange={(v) => setInv("source", v)}
            placeholder="e.g. Press release, Crunchbase"
          />
        </div>
      </div>

      <Sec
        title="Enterprise value (EV)"
        description="The implied total value of the business at the time of the deal."
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FL hint="in millions">Enterprise value (£/$/€m)</FL>
          <TI
            value={data.ev_data.ev_value}
            onChange={(v) => setEv("ev_value", v)}
            placeholder="e.g. 120.0"
          />
        </div>
        <div>
          <FL>Currency</FL>
          <TI
            value={data.ev_data.ev_currency}
            onChange={(v) => {
              const n = parseInt(v, 10);
              setEv("ev_currency", v === "" || Number.isNaN(n) ? null : n);
            }}
            type="number"
            placeholder="Currency ID"
          />
        </div>
        <div>
          <FL hint="financial year the EV relates to">Year</FL>
          <TI
            value={data.ev_data.ev_year}
            onChange={(v) => {
              const n = parseInt(v, 10);
              setEv("ev_year", v === "" || Number.isNaN(n) ? null : n);
            }}
            type="number"
            placeholder="e.g. 2024"
          />
        </div>
        <div>
          <FL>Source</FL>
          <TI
            value={data.ev_data.ev_source}
            onChange={(v) => setEv("ev_source", v)}
            placeholder="e.g. Deal announcement, broker note"
          />
        </div>
      </div>

      <Sec
        title="Deal terms"
        description="Structure and payment details of the transaction."
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FL hint="how the deal was paid for">Consideration type</FL>
          <SI
            value={data.deal_terms_data.consideration_type}
            onChange={(v) => setTerms("consideration_type", v)}
            options={CONSIDERATION_OPTIONS}
            placeholder="Select…"
          />
        </div>
        <div>
          <FL hint="cash element in millions">
            Cash component (£/$/€m)
          </FL>
          <TI
            value={data.deal_terms_data.cash_component}
            onChange={(v) => setTerms("cash_component", v)}
            placeholder="e.g. 30.0"
          />
        </div>
        <div>
          <FL hint="stock/equity element in millions">
            Stock component (£/$/€m)
          </FL>
          <TI
            value={data.deal_terms_data.stock_component}
            onChange={(v) => setTerms("stock_component", v)}
            placeholder="e.g. 15.0"
          />
        </div>
        <div>
          <FL hint="debt taken on as part of the deal">
            Debt assumed (£/$/€m)
          </FL>
          <TI
            value={data.deal_terms_data.debt_assumed}
            onChange={(v) => setTerms("debt_assumed", v)}
            placeholder="e.g. 5.0"
          />
        </div>
        <div>
          <FL hint="e.g. deferred consideration amount">
            Earn-out (£/$/€m)
          </FL>
          <TI
            value={data.deal_terms_data.earn_out}
            onChange={(v) => setTerms("earn_out", v)}
            placeholder="e.g. 10.0"
          />
        </div>
        <div>
          <FL hint="conditions or milestones attached to earn-out">
            Earn-out details
          </FL>
          <TI
            value={data.deal_terms_data.earn_out_details}
            onChange={(v) => setTerms("earn_out_details", v)}
            placeholder="e.g. Based on 2-year revenue targets"
          />
        </div>
        <div className="col-span-2">
          <FL hint="any other terms worth noting">
            Payment terms / notes
          </FL>
          <TA
            value={data.deal_terms_data.payment_terms}
            onChange={(v) => setTerms("payment_terms", v)}
            placeholder="Any additional payment or structural notes…"
            rows={2}
          />
        </div>
        <div>
          <FL>Terms source</FL>
          <TI
            value={data.deal_terms_data.source}
            onChange={(v) => setTerms("source", v)}
            placeholder="e.g. Companies House, deal press release"
          />
        </div>
      </div>

      <Div />
      <Toggle
        checked={data.True_EV_and_Revs_or_EBITDA_disclosed}
        onChange={(v) => set("True_EV_and_Revs_or_EBITDA_disclosed", v)}
        label="EV and revenue / EBITDA both disclosed"
        description="Flag this if we have both the enterprise value AND at least one of revenue or EBITDA for this deal. This enables EV multiple calculations."
      />
    </div>
  );
}

// ─── Tab: Publishing ──────────────────────────────────────────────────────────

function PublishTab({
  data,
  set,
}: {
  data: CorporateEventFormData;
  set: SetFn;
}) {
  const isReadyToPublish = data.ready_to_publish;
  const hasDescription = data.description.trim().length > 0;
  const hasDealType = data.deal_type !== "";
  const hasDealStatus = data.deal_status !== "";
  const hasDate = data.announcement_date !== "";

  const checks = [
    { label: "Short description", ok: hasDescription },
    { label: "Deal type selected", ok: hasDealType },
    { label: "Deal status selected", ok: hasDealStatus },
    { label: "Announcement date", ok: hasDate },
  ];

  const allPassed = checks.every((c) => c.ok);

  return (
    <div>
      <Sec
        title="Publish checklist"
        description="All required fields must be completed before this event can be published to clients."
      />

      <div className="border border-[color:var(--color-border-tertiary)] rounded-lg overflow-hidden mb-5">
        {checks.map((c, i) => (
          <div
            key={c.label}
            className={`flex items-center gap-3 px-4 py-3 text-[13px] ${
              i > 0 ? "border-t border-[color:var(--color-border-tertiary)]" : ""
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                c.ok ? "bg-emerald-500" : "bg-[color:var(--color-border-secondary)]"
              }`}
            >
              {c.ok && (
                <svg
                  width="8"
                  height="6"
                  viewBox="0 0 8 6"
                  fill="none"
                >
                  <path
                    d="M1 3l2 2 4-4"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              className={
                c.ok
                  ? "text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-tertiary)]"
              }
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {!allPassed && (
        <Callout>
          Complete the items above before marking this event as ready to
          publish.
        </Callout>
      )}

      <Toggle
        checked={isReadyToPublish}
        onChange={(v) => set("ready_to_publish", v)}
        label="Ready to publish"
        description="When enabled, this corporate event will be visible to clients on the platform. Make sure all counterparties and advisors have been added first."
      />

      {isReadyToPublish && !allPassed && (
        <p className="mt-3 text-[12px] text-amber-500">
          Some required fields are still missing — the event may not display
          correctly.
        </p>
      )}
    </div>
  );
}

// ─── Default empty state ──────────────────────────────────────────────────────

const EMPTY: CorporateEventFormData = {
  description: "",
  long_description: "",
  deal_type: "",
  deal_status: "",
  announcement_date: "",
  closed_date: "",
  investment_data: {
    amount: "",
    currency_id: null,
    funding_stage: "",
    pre_money_valuation: "",
    investor_count: null,
    source: "",
  },
  ev_data: {
    ev_value: "",
    ev_currency: null,
    ev_year: null,
    ev_source: "",
  },
  deal_terms_data: {
    consideration_type: "",
    cash_component: "",
    stock_component: "",
    earn_out: "",
    earn_out_details: "",
    debt_assumed: "",
    payment_terms: "",
    source: "",
  },
  True_EV_and_Revs_or_EBITDA_disclosed: false,
  ready_to_publish: false,
};

// ─── Main component ───────────────────────────────────────────────────────────

interface CorporateEventFormProps {
  initialData?: Partial<CorporateEventFormData>;
  onSave: (payload: CorporateEventFormData) => Promise<void>;
  onDiscard?: () => void;
  lastSentAt?: string;
  mode?: "create" | "edit";
}

export default function CorporateEventForm({
  initialData,
  onSave,
  onDiscard,
  lastSentAt,
  mode = "create",
}: CorporateEventFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("deal");
  const [data, setData] = useState<CorporateEventFormData>({
    ...EMPTY,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const set: SetFn = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!data.description.trim()) return;
    setSaving(true);
    try {
      await onSave(toApiPayload(data));
    } finally {
      setSaving(false);
    }
  };

  const panels: Record<TabId, React.ReactNode> = {
    deal: <DealTab data={data} set={set} />,
    financials: <FinancialsTab data={data} set={set} />,
    publish: <PublishTab data={data} set={set} />,
  };

  const headerSummary = [data.deal_type, data.deal_status]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border border-[color:var(--color-border-tertiary)] rounded-xl bg-[color:var(--color-background-primary)] overflow-hidden">
      <div className="px-5 pt-4 pb-0 border-b border-[color:var(--color-border-tertiary)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium text-[color:var(--color-text-primary)]">
              {mode === "create"
                ? "New corporate event"
                : data.description || "Edit corporate event"}
            </h2>
            {headerSummary && (
              <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-0.5">
                {headerSummary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
            {data.ready_to_publish && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[color:var(--color-background-success)] text-[color:var(--color-text-success)]">
                Published
              </span>
            )}
            {data.deal_status && (
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${
                  STATUS_COLORS[data.deal_status] ??
                  "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)]"
                }`}
              >
                {data.deal_status}
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

      <div className="p-6 overflow-y-auto max-h-[600px]">
        {panels[activeTab]}
      </div>

      <div className="px-5 py-3.5 border-t border-[color:var(--color-border-tertiary)] flex items-center justify-between">
        <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
          {lastSentAt
            ? `Last sent to clients ${lastSentAt}`
            : mode === "create"
              ? "Not yet saved"
              : "Not yet sent to clients"}
        </span>
        <div className="flex gap-2">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="h-8 px-4 text-[12px] rounded-lg border border-[color:var(--color-border-secondary)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-background-secondary)] transition-colors"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              !data.description.trim() ||
              !data.deal_type ||
              !data.deal_status
            }
            className="h-8 px-4 text-[12px] rounded-lg bg-[color:var(--color-text-primary)] text-[color:var(--color-background-primary)] hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
          >
            {saving ? "Saving…" : mode === "create" ? "Create event" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
