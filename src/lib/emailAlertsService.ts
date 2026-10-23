import { authService } from "./auth";
import { isMcpGuestSession, MCP_GUEST_OTP_LOGIN_PATH } from "./mcpGuest";
import type {
  EmailAlert,
  EmailAlertsMeta,
  EmailAlertFilters,
  EmailAlertFiltersWire,
  EmailAlertContentType,
  EmailScope,
  EmailSection,
} from "@/types/emailAlerts";
import {
  buildCeTypeFilterArraysForApi,
  isCorporateEventsEmailAlert,
  parseCeFilterValues,
} from "@/lib/ceEmailAlertFilters";

function normalizeEntityFilters(
  raw: EmailAlertFilters | null | undefined
): Pick<
  EmailAlertFilters,
  "companies" | "sectors" | "individuals" | "investors" | "advisors"
> {
  const keys = [
    "companies",
    "sectors",
    "individuals",
    "investors",
    "advisors",
  ] as const;
  const out: Pick<
    EmailAlertFilters,
    "companies" | "sectors" | "individuals" | "investors" | "advisors"
  > = {};
  for (const key of keys) {
    const val = raw?.[key];
    out[key] = Array.isArray(val)
      ? val.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      : [];
  }
  return out;
}

function parseFiltersRaw(raw: unknown): unknown {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

const EMAIL_SECTIONS: readonly EmailSection[] = [
  "corporate_events",
  "insights_analysis",
  "deal_radar",
  "news",
];
const EMAIL_SCOPES: readonly EmailScope[] = ["all", "follow", "portfolio", "list"];

/** Email-preferences extras that ride along in the filters JSON. */
function parsePreferenceExtras(
  source: Record<string, unknown> | null
): Partial<EmailAlertFilters> {
  const out: Partial<EmailAlertFilters> = {};
  if (!source) return out;

  if (typeof source.name === "string" && source.name.trim()) {
    out.name = source.name.trim();
  }
  if (Array.isArray(source.sections)) {
    const sections = source.sections.filter((v): v is EmailSection =>
      EMAIL_SECTIONS.includes(v as EmailSection)
    );
    if (sections.length) out.sections = sections;
  }
  if (EMAIL_SCOPES.includes(source.scope as EmailScope)) {
    out.scope = source.scope as EmailScope;
  }
  const listId = Number(source.list_id);
  if (Number.isFinite(listId) && listId > 0) out.list_id = listId;
  if (Array.isArray(source.countries)) {
    out.countries = source.countries.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
  }
  if (Array.isArray(source.primary_sectors)) {
    out.primary_sectors = source.primary_sectors.filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n)
    );
  }
  return out;
}

function parseStoredFilters(raw: unknown): EmailAlertFilters {
  const parsed = parseFiltersRaw(raw);
  const out: EmailAlertFilters = {
    ...normalizeEntityFilters(parsed as EmailAlertFilters | null | undefined),
  };

  const source =
    parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

  const dealTypes = parseCeFilterValues(
    source?.deal_types as string | string[] | undefined
  );
  if (dealTypes) {
    out.deal_types = dealTypes;
  }

  const fundingStages = parseCeFilterValues(
    source?.funding_stages as string | string[] | undefined
  );
  if (fundingStages) {
    out.funding_stages = fundingStages;
  }

  Object.assign(out, parsePreferenceExtras(source));

  return out;
}

function buildFiltersWirePayload(
  filters: EmailAlertFilters | null | undefined,
  itemType: EmailAlert["item_type"]
): EmailAlertFiltersWire {
  const entity = normalizeEntityFilters(filters);
  const ceTypeArrays = isCorporateEventsEmailAlert(itemType)
    ? buildCeTypeFilterArraysForApi(
        filters?.deal_types,
        filters?.funding_stages
      )
    : { deal_types: [], funding_stages: [] };

  return {
    companies: entity.companies ?? [],
    sectors: entity.sectors ?? [],
    individuals: entity.individuals ?? [],
    investors: entity.investors ?? [],
    advisors: entity.advisors ?? [],
    deal_types: ceTypeArrays.deal_types,
    funding_stages: ceTypeArrays.funding_stages,
    name: filters?.name,
    sections: filters?.sections,
    scope: filters?.scope,
    list_id: filters?.list_id ?? null,
    countries: filters?.countries ?? [],
    primary_sectors: filters?.primary_sectors ?? [],
  };
}

function resolveDayOfWeekForApi(
  emailFrequency: EmailAlert["email_frequency"],
  dayOfWeek: string | null | undefined
): string | null {
  if (emailFrequency !== "weekly") return null;
  const trimmed = (dayOfWeek || "").trim();
  return trimmed || null;
}

function resolveContentTypeForApi(
  alert: Pick<EmailAlert, "item_type" | "email_frequency" | "content_type">
): EmailAlertContentType {
  if (
    alert.item_type === "insights_analysis" &&
    alert.email_frequency === "as_added"
  ) {
    if (alert.content_type === "preview" || alert.content_type === "full_body") {
      return alert.content_type;
    }
    return "preview";
  }
  return "digest";
}

/** Body for the email-alerts proxy; the email service computes next_run_at_utc itself. */
function buildAlertRequestBody(alert: EmailAlert): Record<string, unknown> {
  return {
    item_type: alert.item_type,
    email_frequency: alert.email_frequency,
    day_of_week: resolveDayOfWeekForApi(
      alert.email_frequency,
      alert.day_of_week
    ),
    timezone: alert.timezone || "Europe/London",
    content_type: resolveContentTypeForApi(alert),
    is_active: alert.is_active,
    send_time_local:
      alert.email_frequency === "as_added" ? null : alert.send_time_local ?? null,
    filters: buildFiltersWirePayload(alert.filters, alert.item_type),
  };
}

interface EmailAlertsResponse {
  alerts: EmailAlert[];
  meta: EmailAlertsMeta;
}

function parseAlertsListPayload(payload: unknown): EmailAlert[] {
  if (Array.isArray(payload)) {
    return payload as EmailAlert[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.alerts)) {
      return record.alerts as EmailAlert[];
    }
    if (Array.isArray(record.data)) {
      return record.data as EmailAlert[];
    }
  }
  return [];
}

function coerceIsActive(value: unknown): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return Boolean(value);
}

function normalizeAlertRow(
  raw: EmailAlert & { user_email_alerts_id?: number }
): EmailAlert {
  const id =
    typeof raw.id === "number" && Number.isFinite(raw.id)
      ? raw.id
      : typeof raw.user_email_alerts_id === "number"
        ? raw.user_email_alerts_id
        : 0;
  const createdAt =
    typeof raw.created_at === "number" && Number.isFinite(raw.created_at)
      ? raw.created_at
      : 0;
  return {
    ...raw,
    id,
    created_at: createdAt,
    user_id: Number(raw.user_id) || 0,
    is_active: coerceIsActive(raw.is_active),
    day_of_week: raw.day_of_week || null,
    content_type: resolveContentTypeForApi(raw),
    filters: parseStoredFilters(raw.filters),
  };
}

export interface EmailAlertsListQuery {
  item_type?: string;
  email_frequency?: EmailAlert["email_frequency"];
  is_active?: boolean;
}

class EmailAlertsService {
  private async requestAppRoute<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = authService.getToken();
    if (token) {
      headers["x-asym-token"] = token;
    }

    const response = await fetch(path, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        const user = authService.getUser();
        const redirectTo = isMcpGuestSession(token, user)
          ? MCP_GUEST_OTP_LOGIN_PATH
          : "/login";
        authService.logout();
        window.location.href = redirectTo;
        throw new Error("Authentication required");
      }
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `API request failed: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    return response.json() as Promise<T>;
  }

  // Get user's email alerts (Fly email service via Next.js proxy)
  async getEmailAlerts(
    userId: number,
    query?: EmailAlertsListQuery
  ): Promise<EmailAlertsResponse> {
    const params = new URLSearchParams({ user_id: String(userId) });
    if (query?.item_type) {
      params.set("item_type", query.item_type);
    }
    if (query?.email_frequency) {
      params.set("email_frequency", query.email_frequency);
    }
    if (query?.is_active !== undefined) {
      params.set("is_active", query.is_active ? "true" : "false");
    }

    const response = await this.requestAppRoute<unknown>(
      `/api/email-alerts?${params.toString()}`,
      { method: "GET" }
    );

    const rawAlerts = parseAlertsListPayload(response);
    const alerts: EmailAlert[] = rawAlerts.map((a) =>
      normalizeAlertRow(a as EmailAlert & { user_email_alerts_id?: number })
    );

    const meta: EmailAlertsMeta = {
      enums: {
        item_type: [
          { value: "corporate_events", label: "Corporate Events" },
          { value: "insights_analysis", label: "Insights & Analysis" },
          { value: "deal_radar", label: "Deal Radar" },
          {
            value: "digest",
            label: "Corporate Events, Insights & Analysis, and Deal Radar",
          },
          { value: "weekly_news", label: "Weekly News" },
          { value: "news", label: "News" },
        ],
        email_frequency: [
          { value: "as_added", label: "As they are added to platform" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ],
        day_of_week: [
          { value: "monday", label: "Monday" },
          { value: "tuesday", label: "Tuesday" },
          { value: "wednesday", label: "Wednesday" },
          { value: "thursday", label: "Thursday" },
          { value: "friday", label: "Friday" },
          { value: "saturday", label: "Saturday" },
          { value: "sunday", label: "Sunday" },
        ],
        content_type: [
          { value: "preview", label: "Preview" },
          { value: "full_body", label: "Text of Report in Body of Email" },
          { value: "digest", label: "Digest" },
        ],
      },
      defaults: {
        timezone: "Europe/London",
        daily_send_time_local: "1970-01-01T09:00:00Z",
      },
    };

    return { alerts, meta };
  }

  async createEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const row = await this.requestAppRoute<
      EmailAlert & { user_email_alerts_id?: number }
    >("/api/email-alerts", {
      method: "POST",
      body: JSON.stringify(buildAlertRequestBody(alert)),
    });
    return normalizeAlertRow(row);
  }

  async updateEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const row = await this.requestAppRoute<
      EmailAlert & { user_email_alerts_id?: number }
    >(`/api/email-alerts/${alert.id}`, {
      method: "PATCH",
      body: JSON.stringify(buildAlertRequestBody(alert)),
    });
    return normalizeAlertRow(row);
  }

  async setEmailAlertActive(
    alertId: number,
    isActive: boolean
  ): Promise<EmailAlert> {
    const row = await this.requestAppRoute<
      EmailAlert & { user_email_alerts_id?: number }
    >(`/api/email-alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
    return normalizeAlertRow(row);
  }

  async deleteEmailAlert(alertId: number): Promise<void> {
    await this.requestAppRoute<unknown>(`/api/email-alerts/${alertId}`, {
      method: "DELETE",
    });
  }
}

export const emailAlertsService = new EmailAlertsService();
