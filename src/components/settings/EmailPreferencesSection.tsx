"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { emailAlertsService } from "@/lib/emailAlertsService";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { fetchUserListsFromXano } from "@/lib/userLists";
import { locationsService } from "@/lib/locationsService";
import { fetchNewsFilterOptions, fetchNewsFollowing, setNewsFollowing } from "@/lib/news";
import { buildCountryOptions } from "@/lib/countryOptions";
import {
  alertToPref,
  describeSchedule,
  EMAIL_SECTION_OPTIONS,
  isListedAlert,
  isWeeklyNewsAlert,
  newEmailPref,
  prefToAlert,
  sectionLabel,
  summariseFilters,
  type EmailPref,
} from "@/lib/emailPreferences";
import {
  EmailEditorPanel,
  type EmailEditorReferenceData,
} from "@/components/settings/EmailEditorPanel";
import type { MultiSelectOption } from "@/components/settings/EmailPrefsMultiSelect";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const FALLBACK_SEND_TIME = "09:00";
const DEFAULT_TIMEZONE = "Europe/London";

function toHHmm(value: string | null | undefined): string {
  if (!value) return FALLBACK_SEND_TIME;
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? FALLBACK_SEND_TIME
    : date.toTimeString().slice(0, 5);
}

function blankAlert(userId: number): EmailAlert {
  return {
    id: 0,
    created_at: Date.now(),
    user_id: userId,
    item_type: "digest",
    email_frequency: "daily",
    day_of_week: null,
    timezone: DEFAULT_TIMEZONE,
    content_type: "digest",
    is_active: true,
    send_time_local: FALLBACK_SEND_TIME,
    next_run_at_utc: null,
    last_sent_at_utc: null,
    status: "scheduled",
    filters: {},
  };
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h13v16H6a2 2 0 0 1-2-2z" />
      <path d="M17 8h3v10a2 2 0 0 1-2 2" />
      <path d="M8 8h5M8 12h5M8 16h3" />
    </svg>
  );
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-3.5 pb-2 border-t border-gray-100 bg-slate-50/60 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 first:border-t-0">
      {children}
    </div>
  );
}

interface EmailRowProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  chips?: string[];
  description: string;
  when: string;
  whenSub?: string;
  isActive: boolean;
  switchLabel: string;
  switchDisabled?: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function EmailRow(props: EmailRowProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-3.5 px-5 py-3.5 border-t border-gray-100 hover:bg-slate-50 ${
        props.isActive ? "" : "opacity-90"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
          props.isActive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-400"
        }`}
      >
        {props.icon}
      </div>
      <div className="min-w-0">
        <h3
          className={`flex flex-wrap items-center gap-2 text-sm font-bold ${
            props.isActive ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {props.title}
          {props.badge && (
            <span className="text-[11.5px] font-medium text-gray-500">{props.badge}</span>
          )}
        </h3>
        {props.chips && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {props.chips.map((chip) => (
              <span
                key={chip}
                className={`inline-flex h-5 items-center rounded-full bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 ${
                  props.isActive ? "" : "opacity-55"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-[12.5px] leading-snug text-gray-500">{props.description}</p>
      </div>
      <div className="text-[12.5px] text-gray-800 sm:text-right whitespace-nowrap">
        {props.when}
        {props.whenSub && (
          <span className="block text-[11.5px] text-gray-500">{props.whenSub}</span>
        )}
      </div>
      <div className="flex items-center gap-3.5 whitespace-nowrap">
        <Switch
          checked={props.isActive}
          onChange={props.onToggle}
          label={props.switchLabel}
          disabled={props.switchDisabled}
        />
        {props.onEdit ? (
          <button type="button" onClick={props.onEdit} className="text-[12.5px] font-semibold text-blue-600 hover:text-blue-700">
            Edit
          </button>
        ) : (
          <span className="invisible text-[12.5px]">Edit</span>
        )}
        {props.onDelete && (
          <button type="button" onClick={props.onDelete} className="text-[12.5px] font-semibold text-red-600 hover:text-red-700">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function EmailPreferencesSection({ userId }: { userId: number }) {
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [meta, setMeta] = useState<EmailAlertsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<EmailPref | null>(null);
  const [editingBase, setEditingBase] = useState<EmailAlert | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [countries, setCountries] = useState<MultiSelectOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [sectors, setSectors] = useState<MultiSelectOption[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [lists, setLists] = useState<Array<{ id: number; label: string }>>([]);
  const [listsLoading, setListsLoading] = useState(true);

  const loadAlerts = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        setError(null);
        const response = await emailAlertsService.getEmailAlerts(userId);
        setAlerts(response.alerts);
        setMeta(response.meta);
      } catch (err) {
        console.error("Error loading email alerts:", err);
        setError(err instanceof Error ? err.message : "Failed to load email alerts");
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsFollowing()
      .then((v) => !cancelled && setFollowing(v))
      .catch(() => !cancelled && setFollowing(null));

    Promise.all([
      fetchNewsFilterOptions().then((o) => o.countries).catch(() => []),
      locationsService
        .getCountries()
        .then((rows) => rows.map((r) => r.locations_Country).filter(Boolean))
        .catch(() => [] as string[]),
    ])
      .then(([news, hq]) => {
        if (!cancelled) setCountries(buildCountryOptions(news, hq));
      })
      .finally(() => !cancelled && setCountriesLoading(false));

    locationsService
      .getPrimarySectors()
      .then((rows) => {
        if (cancelled) return;
        setSectors(rows.map((r) => ({ value: String(r.id), label: r.sector_name })));
      })
      .catch(() => !cancelled && setSectors([]))
      .finally(() => !cancelled && setSectorsLoading(false));

    fetchUserListsFromXano()
      .then((raw) => {
        if (cancelled) return;
        const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
        setLists(
          arr
            .map((item) => ({
              id: Number(item.id),
              label:
                (typeof item.portfolio_label === "string" && item.portfolio_label.trim()) ||
                `List ${Number(item.id)}`,
            }))
            .filter((l) => Number.isFinite(l.id) && l.id > 0)
        );
      })
      .catch(() => !cancelled && setLists([]))
      .finally(() => !cancelled && setListsLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const reference: EmailEditorReferenceData = {
    countries,
    countriesLoading,
    sectors,
    sectorsLoading,
    lists,
    listsLoading,
  };

  const listed = useMemo(() => alerts.filter(isListedAlert), [alerts]);
  const weeklyNews = useMemo(() => alerts.find(isWeeklyNewsAlert) ?? null, [alerts]);

  const activeCount =
    listed.filter((a) => a.is_active).length +
    (weeklyNews?.is_active ? 1 : 0) +
    (following ? 1 : 0);

  const defaultSendTime = toHHmm(meta?.defaults.daily_send_time_local);
  const countryNameOf = (iso: string) =>
    countries.find((c) => c.value === iso)?.label ?? iso;
  const sectorNameOf = (id: number) =>
    sectors.find((s) => s.value === String(id))?.label ?? String(id);

  const toggleAlert = async (alert: EmailAlert) => {
    const next = !alert.is_active;
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: next } : a)));
    try {
      await emailAlertsService.setEmailAlertActive(alert.id, next);
    } catch (err) {
      console.error("Error toggling alert:", err);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: alert.is_active } : a))
      );
      setError(err instanceof Error ? err.message : "Failed to update email");
    }
  };

  const toggleWeeklyNews = async () => {
    if (weeklyNews) {
      await toggleAlert(weeklyNews);
      return;
    }
    try {
      setError(null);
      await emailAlertsService.createEmailAlert({
        ...blankAlert(userId),
        item_type: "weekly_news",
        email_frequency: "weekly",
        day_of_week: "friday",
        send_time_local: "08:00",
        timezone: DEFAULT_TIMEZONE,
      });
      await loadAlerts(false);
    } catch (err) {
      console.error("Error enabling Weekly News:", err);
      setError(err instanceof Error ? err.message : "Failed to enable Weekly News");
    }
  };

  const toggleFollowing = async () => {
    const next = !following;
    setFollowing(next);
    try {
      setFollowing(await setNewsFollowing(next));
    } catch (err) {
      console.error("Error updating Follow news:", err);
      setFollowing(!next);
      setError(err instanceof Error ? err.message : "Failed to update Follow news");
    }
  };

  const deleteAlert = async (alert: EmailAlert) => {
    const name = alertToPref(alert).name;
    if (!confirm(`Delete “${name}”? This can't be undone.`)) return;
    try {
      setError(null);
      await emailAlertsService.deleteEmailAlert(alert.id);
      await loadAlerts(false);
    } catch (err) {
      console.error("Error deleting alert:", err);
      setError(err instanceof Error ? err.message : "Failed to delete email");
    }
  };

  const openNew = () => {
    setPanelError(null);
    setEditingBase(blankAlert(userId));
    setEditing(newEmailPref({ sendTime: defaultSendTime, timezone: DEFAULT_TIMEZONE }));
  };

  const openEdit = (alert: EmailAlert) => {
    setPanelError(null);
    setEditingBase(alert);
    setEditing({ ...alertToPref(alert), sendTime: alert.send_time_local && toHHmm(alert.send_time_local) });
  };

  const closePanel = useCallback(() => {
    setEditing(null);
    setEditingBase(null);
  }, []);

  const savePref = async (pref: EmailPref) => {
    if (!editingBase) return;
    const alert = prefToAlert(pref, editingBase);
    try {
      setSaving(true);
      setPanelError(null);
      if (pref.id === 0) {
        await emailAlertsService.createEmailAlert(alert);
      } else {
        await emailAlertsService.updateEmailAlert(alert);
      }
      await loadAlerts(false);
      closePanel();
    } catch (err) {
      console.error("Error saving email:", err);
      setPanelError(err instanceof Error ? err.message : "Failed to save email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-baseline gap-3 px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">Email preferences</h2>
          <span className="text-xs text-gray-500">{activeCount} active</span>
          <button
            type="button"
            onClick={openNew}
            disabled={isLoading || !!error}
            className="ml-auto px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            New email
          </button>
        </div>

        {isLoading && (
          <div className="py-10">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!isLoading && (
          <>
            <GroupHeading>Your emails</GroupHeading>
            {listed.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500 border-t border-gray-100">
                You don&apos;t have any emails set up yet. Create one to receive
                Corporate Events, Insights &amp; Analysis, Deal Radar or News in your inbox.
              </p>
            ) : (
              listed.map((alert) => {
                const pref = alertToPref(alert);
                const schedule = describeSchedule(pref);
                const filterText = summariseFilters(pref, {
                  listLabel: lists.find((l) => l.id === pref.listId)?.label,
                  countryNames: pref.countries.map(countryNameOf),
                  sectorNames: pref.primarySectors.map(sectorNameOf),
                });
                return (
                  <EmailRow
                    key={alert.id}
                    icon={<MailIcon />}
                    title={pref.name}
                    chips={
                      pref.sections.length === EMAIL_SECTION_OPTIONS.length
                        ? ["All content"]
                        : pref.sections.map(sectionLabel)
                    }
                    description={
                      pref.hasLegacyEntityFilters
                        ? `${filterText} · followed-entity filter`
                        : filterText
                    }
                    when={schedule.when}
                    whenSub={schedule.tz}
                    isActive={alert.is_active}
                    switchLabel={pref.name}
                    onToggle={() => toggleAlert(alert)}
                    onEdit={() => openEdit(alert)}
                    onDelete={() => deleteAlert(alert)}
                  />
                );
              })
            )}

            <GroupHeading>Asymmetrix emails</GroupHeading>
            <EmailRow
              icon={<NewsIcon />}
              title="Weekly News"
              badge="Fixed schedule"
              description="Roundup of every News article published since the previous send."
              when="Fridays, 08:00"
              whenSub="London (GMT/BST)"
              isActive={!!weeklyNews?.is_active}
              switchLabel="Weekly News"
              onToggle={toggleWeeklyNews}
            />
            <EmailRow
              icon={<NewsIcon />}
              title="Follow news"
              badge="Fixed schedule"
              description="An email whenever a News article is published."
              when="When published"
              isActive={!!following}
              switchLabel="Follow news"
              switchDisabled={following === null}
              onToggle={toggleFollowing}
            />
            <p className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
              Every email has a one-click unsubscribe for that email only, which
              switches it off here.
            </p>
          </>
        )}
      </div>

      <EmailEditorPanel
        initial={editing}
        isNew={editing?.id === 0}
        reference={reference}
        saving={saving}
        error={panelError}
        onSave={savePref}
        onClose={closePanel}
      />
    </>
  );
}
