"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmailSection } from "@/types/emailAlerts";
import {
  CE_DEAL_TYPE_OPTIONS,
  CE_FUNDING_STAGE_GROUPS,
} from "@/lib/ceEmailAlertFilters";
import {
  autoEmailName,
  COMMON_TIMEZONES,
  EMAIL_FREQUENCY_OPTIONS,
  EMAIL_SCOPE_OPTIONS,
  EMAIL_SECTION_OPTIONS,
  summariseFilters,
  WEEKDAY_OPTIONS,
  type EmailPref,
} from "@/lib/emailPreferences";
import {
  EmailPrefsMultiSelect,
  type MultiSelectOption,
} from "@/components/settings/EmailPrefsMultiSelect";

export interface EmailEditorReferenceData {
  countries: MultiSelectOption[];
  countriesLoading: boolean;
  sectors: MultiSelectOption[];
  sectorsLoading: boolean;
  lists: Array<{ id: number; label: string }>;
  listsLoading: boolean;
}

interface EmailEditorPanelProps {
  initial: EmailPref | null;
  isNew: boolean;
  reference: EmailEditorReferenceData;
  saving: boolean;
  error: string | null;
  onSave: (pref: EmailPref) => void;
  onClose: () => void;
}

const DEAL_TYPE_OPTIONS: MultiSelectOption[] = CE_DEAL_TYPE_OPTIONS.map((v) => ({
  value: v,
  label: v,
}));

const FUNDING_STAGE_OPTIONS: MultiSelectOption[] = CE_FUNDING_STAGE_GROUPS.flatMap(
  (g) => g.values.map((v) => ({ value: v, label: v, group: g.label }))
);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <p className="text-[12.5px] font-semibold text-gray-900 mb-2">
        {label}
        {hint && (
          <span className="ml-1.5 font-normal text-gray-500">{hint}</span>
        )}
      </p>
      {children}
    </div>
  );
}

const pillClass = (on: boolean) =>
  `inline-flex items-center gap-1.5 h-8 px-3 border rounded-full text-[13px] font-medium cursor-pointer select-none whitespace-nowrap ${
    on
      ? "border-blue-600 bg-blue-50 text-blue-700"
      : "border-gray-200 bg-white text-gray-700"
  }`;

const controlClass =
  "h-8 px-2.5 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 focus:outline-none focus:border-blue-600";

export function EmailEditorPanel({
  initial,
  isNew,
  reference,
  saving,
  error,
  onSave,
  onClose,
}: EmailEditorPanelProps) {
  const [draft, setDraft] = useState<EmailPref | null>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    if (!initial) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [initial, onClose]);

  const countryNames = useMemo(() => {
    const byValue = new Map(reference.countries.map((o) => [o.value, o.label]));
    return (draft?.countries ?? []).map((v) => byValue.get(v) ?? v);
  }, [draft?.countries, reference.countries]);

  const sectorNames = useMemo(() => {
    const byValue = new Map(reference.sectors.map((o) => [o.value, o.label]));
    return (draft?.primarySectors ?? []).map(
      (v) => byValue.get(String(v)) ?? String(v)
    );
  }, [draft?.primarySectors, reference.sectors]);

  const open = !!draft;
  const patch = (p: Partial<EmailPref>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const hasCe = !!draft?.sections.includes("corporate_events");
  const suggestedName = draft
    ? autoEmailName(draft, countryNames, sectorNames)
    : "";
  const listLabel = reference.lists.find((l) => l.id === draft?.listId)?.label;

  const toggleSection = (section: EmailSection) => {
    if (!draft) return;
    const next = draft.sections.includes(section)
      ? draft.sections.filter((s) => s !== section)
      : EMAIL_SECTION_OPTIONS.map((o) => o.value).filter(
          (s) => draft.sections.includes(s) || s === section
        );
    patch({ sections: next });
  };

  const listMissing = draft?.scope === "list" && draft.listId == null;
  const timeMissing = draft?.frequency !== "as_added" && !draft?.sendTime;
  const canSave = !!draft && draft.sections.length > 0 && !listMissing && !timeMissing;

  const summary = draft
    ? draft.sections.length === 0
      ? "Pick at least one content type."
      : `${draft.name.trim() || suggestedName}: ${
          draft.sections.length === EMAIL_SECTION_OPTIONS.length
            ? "all content"
            : draft.sections
                .map((s) => EMAIL_SECTION_OPTIONS.find((o) => o.value === s)?.label)
                .join(", ")
        } · ${summariseFilters(draft, { listLabel, countryNames, sectorNames })}. Sections with no matching items are left out, and nothing is sent if every section is empty.`
    : "";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-900/35 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-label="Email editor"
        className={`fixed top-0 right-0 z-[51] h-full w-[560px] max-w-[96vw] bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isNew ? "New email" : "Edit email"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-2xl leading-none text-gray-400 hover:text-gray-600 px-1.5"
          >
            ×
          </button>
        </header>

        {draft && (
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <Field label="Email name">
              <input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={suggestedName}
                className={`${controlClass} w-full !h-9 text-sm`}
              />
            </Field>

            <Field label="Content" hint="One email, a section for each type">
              <div className="flex flex-wrap gap-2">
                {EMAIL_SECTION_OPTIONS.map((o) => {
                  const on = draft.sections.includes(o.value);
                  return (
                    <label key={o.value} className={pillClass(on)}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleSection(o.value)}
                        className="sr-only"
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded border-[1.5px] inline-flex items-center justify-center text-[10px] text-white ${
                          on ? "bg-blue-600 border-blue-600" : "border-gray-300"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </Field>

            <p className="pt-4 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
              Filters
            </p>

            <Field label="Companies">
              <div className="flex flex-wrap items-center gap-2">
                {EMAIL_SCOPE_OPTIONS.map((o) => (
                  <label key={o.value} className={pillClass(draft.scope === o.value)}>
                    <input
                      type="radio"
                      name="email-scope"
                      checked={draft.scope === o.value}
                      onChange={() => patch({ scope: o.value })}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
                {draft.scope === "list" && (
                  <select
                    value={draft.listId ?? ""}
                    onChange={(e) =>
                      patch({ listId: e.target.value ? Number(e.target.value) : null })
                    }
                    className={controlClass}
                  >
                    <option value="">
                      {reference.listsLoading
                        ? "Loading lists…"
                        : reference.lists.length
                          ? "Select a list"
                          : "No saved lists"}
                    </option>
                    {reference.lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {draft.hasLegacyEntityFilters && draft.scope === "all" && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  This email still has followed-entity filters from the old
                  editor. Saving keeps them until you pick a company scope.
                </p>
              )}
            </Field>

            <Field label="Country" hint="Company HQ">
              <EmailPrefsMultiSelect
                options={reference.countries}
                selected={draft.countries}
                onChange={(countries) => patch({ countries })}
                allLabel="All countries"
                loading={reference.countriesLoading}
              />
            </Field>

            <Field label="Primary sector">
              <EmailPrefsMultiSelect
                options={reference.sectors}
                selected={draft.primarySectors.map(String)}
                onChange={(next) => patch({ primarySectors: next.map(Number) })}
                allLabel="All sectors"
                loading={reference.sectorsLoading}
              />
            </Field>

            {hasCe && (
              <>
                <Field label="Deal type" hint="Corporate Events only">
                  <EmailPrefsMultiSelect
                    options={DEAL_TYPE_OPTIONS}
                    selected={draft.dealTypes}
                    onChange={(dealTypes) => patch({ dealTypes })}
                    allLabel="All deal types"
                  />
                </Field>
                <Field label="Funding stage" hint="Corporate Events only">
                  <EmailPrefsMultiSelect
                    options={FUNDING_STAGE_OPTIONS}
                    selected={draft.fundingStages}
                    onChange={(fundingStages) => patch({ fundingStages })}
                    allLabel="All funding stages"
                  />
                </Field>
              </>
            )}

            <p className="pt-4 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
              Schedule
            </p>
            <Field label="Frequency">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={draft.frequency}
                  onChange={(e) => {
                    const frequency = e.target.value as EmailPref["frequency"];
                    patch({
                      frequency,
                      dayOfWeek:
                        frequency === "weekly" ? (draft.dayOfWeek ?? "monday") : null,
                      sendTime:
                        frequency === "as_added" ? null : (draft.sendTime ?? "09:00"),
                    });
                  }}
                  className={controlClass}
                >
                  {EMAIL_FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {draft.frequency === "weekly" && (
                  <select
                    value={draft.dayOfWeek ?? "monday"}
                    onChange={(e) => patch({ dayOfWeek: e.target.value })}
                    className={`${controlClass} capitalize`}
                  >
                    {WEEKDAY_OPTIONS.map((d) => (
                      <option key={d} value={d} className="capitalize">
                        {d}
                      </option>
                    ))}
                  </select>
                )}
                {draft.frequency !== "as_added" && (
                  <>
                    <input
                      type="time"
                      value={draft.sendTime ?? ""}
                      onChange={(e) => patch({ sendTime: e.target.value || null })}
                      className={controlClass}
                    />
                    <select
                      value={draft.timezone}
                      onChange={(e) => patch({ timezone: e.target.value })}
                      className={controlClass}
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </Field>

            <p className="mt-4 rounded-[10px] bg-gray-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-gray-700">
              {summary}
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                {error}
              </p>
            )}
          </div>
        )}

        <footer className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="h-[34px] px-4 text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() =>
              draft &&
              onSave({ ...draft, name: draft.name.trim() || suggestedName })
            }
            className="h-[34px] px-4 text-[13px] font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : isNew ? "Create email" : "Save changes"}
          </button>
        </footer>
      </aside>
    </>
  );
}
