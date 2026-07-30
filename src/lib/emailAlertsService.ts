import { authService } from "./auth";
import { isMcpGuestSession, MCP_GUEST_OTP_LOGIN_PATH } from "./mcpGuest";
import type {
  EmailAlert,
  EmailAlertsMeta,
  EmailAlertFilters,
  EmailAlertFiltersWire,
  EmailAlertContentType,
} from "@/types/emailAlerts";
import {
  buildCeTypeFilterArraysForApi,
  isCorporateEventsEmailAlert,
  parseCeFilterValues,
} from "@/lib/ceEmailAlertFilters";
import { computeNextRunAtUtcIso } from "@/utils/emailAlertSchedule";

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

function parseStoredFilters(raw: unknown): EmailAlertFilters {
  const out: EmailAlertFilters = {
    ...normalizeEntityFilters(raw as EmailAlertFilters | null | undefined),
  };

  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

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

function buildAlertRequestBody(
  alert: EmailAlert,
  options?: { includeId?: boolean }
): Record<string, unknown> {
  const timezone = alert.timezone || "Europe/London";
  const nextRunAtUtcIso = computeNextRunAtUtcIso({
    email_frequency: alert.email_frequency,
    day_of_week: alert.day_of_week,
    timezone,
    send_time_local: alert.send_time_local,
  });
  const nextRunAtUtcMs =
    nextRunAtUtcIso == null ? null : new Date(nextRunAtUtcIso).getTime();

  const body: Record<string, unknown> = {
    user_id: alert.user_id,
    item_type: alert.item_type,
    email_frequency: alert.email_frequency,
    day_of_week: resolveDayOfWeekForApi(
      alert.email_frequency,
      alert.day_of_week
    ),
    timezone,
    content_type: resolveContentTypeForApi(alert),
    is_active: alert.is_active,
    send_time_local:
      alert.email_frequency === "as_added" ? null : alert.send_time_local ?? null,
    next_run_at_utc:
      alert.email_frequency === "as_added" ? null : nextRunAtUtcMs,
    status: "scheduled",
    filters: buildFiltersWirePayload(alert.filters, alert.item_type),
  };

  if (options?.includeId) {
    body.user_email_alerts_id = alert.id;
  } else {
    body.last_sent_at_utc = null;
  }

  return body;
}

interface EmailAlertsResponse {
  alerts: EmailAlert[];
  meta: EmailAlertsMeta;
}

class EmailAlertsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:1-YVocmu:develop";
  }

  // Make authenticated API request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        const token = authService.getToken();
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

    return response.json();
  }

  // Get user's email alerts
  async getEmailAlerts(userId: number): Promise<EmailAlertsResponse> {
    const response = await this.request<EmailAlert[]>(
      `/email-alerts?user_id=${userId}`,
      {
        method: "GET",
      }
    );

    const rawAlerts = Array.isArray(response) ? response : [];
    const alerts: EmailAlert[] = rawAlerts.map((a) => ({
      ...a,
      day_of_week: a.day_of_week || null,
      content_type: resolveContentTypeForApi(a),
      filters: parseStoredFilters(a.filters),
    }));

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
    const body = buildAlertRequestBody(alert);
    return this.request<EmailAlert>("/user_email_alerts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const body = buildAlertRequestBody(alert, { includeId: true });
    return this.request<EmailAlert>(`/user_email_alerts/${alert.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteEmailAlert(alertId: number): Promise<void> {
    await this.request<void>(`/user_email_alerts/${alertId}`, {
      method: "DELETE",
      body: JSON.stringify({ user_email_alerts_id: alertId }),
    });
  }
}

export const emailAlertsService = new EmailAlertsService();
