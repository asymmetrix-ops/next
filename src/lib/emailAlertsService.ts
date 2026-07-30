import { authService } from "./auth";
import { isMcpGuestSession, MCP_GUEST_OTP_LOGIN_PATH } from "./mcpGuest";
import type { EmailAlert, EmailAlertsMeta, EmailAlertFilters } from "@/types/emailAlerts";
import {
  normalizeCeTypeFilters,
  stripCeTypeFiltersIfAllSelected,
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

function parseStoredFilters(raw: EmailAlertFilters | null | undefined): EmailAlertFilters {
  const out: EmailAlertFilters = {
    ...normalizeEntityFilters(raw),
  };

  if (Array.isArray(raw?.deal_types) && raw.deal_types.length > 0) {
    out.deal_types = raw.deal_types.filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
  }

  if (Array.isArray(raw?.funding_stages) && raw.funding_stages.length > 0) {
    out.funding_stages = raw.funding_stages.filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
  }

  return out;
}

function normalizeFilters(raw: EmailAlertFilters | null | undefined): EmailAlertFilters {
  return {
    ...normalizeEntityFilters(raw),
    ...normalizeCeTypeFilters(raw),
  };
}

function buildFiltersPayload(filters: EmailAlertFilters | null | undefined): EmailAlertFilters {
  const normalized = normalizeFilters(filters);
  return stripCeTypeFiltersIfAllSelected({
    companies: normalized.companies ?? [],
    sectors: normalized.sectors ?? [],
    individuals: normalized.individuals ?? [],
    investors: normalized.investors ?? [],
    advisors: normalized.advisors ?? [],
    deal_types: normalized.deal_types,
    funding_stages: normalized.funding_stages,
  });
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
    // GET request with user_id as query parameter
    const response = await this.request<EmailAlert[]>(
      `/email-alerts?user_id=${userId}`,
      {
        method: "GET",
      }
    );

    // If the response is just an array, we need to construct the full response
    // Based on the user's description, the endpoint returns an array directly
    // We'll need to get the meta/enums from somewhere else or hardcode them for now
    const rawAlerts = Array.isArray(response) ? response : [];
    const alerts: EmailAlert[] = rawAlerts.map((a) => ({
      ...a,
      filters: parseStoredFilters(a.filters),
    }));

    // For now, we'll use the hardcoded enums from the user's description
    // In the future, this might come from a separate endpoint
    const meta: EmailAlertsMeta = {
      enums: {
        item_type: [
          { value: "corporate_events", label: "Corporate Events" },
          { value: "insights_analysis", label: "Insights & Analysis" },
          { value: "deal_radar", label: "Deal Radar" },
          { value: "digest", label: "Corporate Events, Insights & Analysis, and Deal Radar" },
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
        ],
      },
      defaults: {
        timezone: "Europe/London",
        daily_send_time_local: "1970-01-01T09:00:00Z",
      },
    };

    return { alerts, meta };
  }

  // Create a new email alert
  async createEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const timezone = alert.timezone || "Europe/London";
    const nextRunAtUtcIso = computeNextRunAtUtcIso({
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week,
      timezone,
      send_time_local: alert.send_time_local,
    });
    // Xano timestamp fields expect milliseconds
    const nextRunAtUtcMs =
      nextRunAtUtcIso == null ? null : new Date(nextRunAtUtcIso).getTime();


    const filtersPayload = buildFiltersPayload(alert.filters);

    // Build base request body
    const body: Record<string, unknown> = {
      user_id: alert.user_id,
      item_type: alert.item_type,
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week || "",
      timezone,
      content_type: alert.content_type || "",
      is_active: alert.is_active,
      send_time_local: alert.send_time_local ?? null,
      next_run_at_utc: nextRunAtUtcMs,
      last_sent_at_utc: null,
      status: "scheduled",
      filters: filtersPayload,
      sectors_id: [],
    };

    // Keep "as_added" clean: it doesn't use time/day scheduling.
    if (alert.email_frequency === "as_added") {
      body.day_of_week = "";
      body.send_time_local = null;
      body.next_run_at_utc = null;
      // content_type is only meaningful for insights_analysis
      if (alert.item_type !== "insights_analysis") {
        body.content_type = "";
      }
    }
    
    // Digest never uses content_type
    if (alert.item_type === "digest") {
      body.content_type = "";
    }

    const response = await this.request<EmailAlert>("/user_email_alerts", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response;
  }

  // Update an email alert
  async updateEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const timezone = alert.timezone || "Europe/London";
    const nextRunAtUtcIso = computeNextRunAtUtcIso({
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week,
      timezone,
      send_time_local: alert.send_time_local,
    });
    const nextRunAtUtcMs =
      nextRunAtUtcIso == null ? null : new Date(nextRunAtUtcIso).getTime();

    const filtersPayload = buildFiltersPayload(alert.filters);

    const body: Record<string, unknown> = {
      user_email_alerts_id: alert.id,
      user_id: alert.user_id,
      item_type: alert.item_type,
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week || "",
      timezone,
      content_type: alert.content_type || "",
      is_active: alert.is_active,
      send_time_local: alert.send_time_local || null,
      next_run_at_utc:
        alert.email_frequency === "as_added" ? null : nextRunAtUtcMs,
      status: "scheduled",
      filters: filtersPayload,
      sectors_id: [],
    };

    const response = await this.request<EmailAlert>(
      `/user_email_alerts/${alert.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return response;
  }

  // Delete an email alert
  async deleteEmailAlert(alertId: number): Promise<void> {
    await this.request<void>(`/user_email_alerts/${alertId}`, {
      method: "DELETE",
      body: JSON.stringify({ user_email_alerts_id: alertId }),
    });
  }
}

export const emailAlertsService = new EmailAlertsService();

