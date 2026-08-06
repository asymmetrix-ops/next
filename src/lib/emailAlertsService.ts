import type { EmailAlert, EmailAlertsMeta, EmailAlertFilters, EntityFilterKey } from "@/types/emailAlerts";

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function normalizeFilters(raw: EmailAlertFilters | null | undefined): EmailAlertFilters {
  const numberKeys: EntityFilterKey[] = [
    "companies",
    "sectors",
    "individuals",
    "investors",
    "advisors",
  ];
  const out: EmailAlertFilters = {};
  for (const key of numberKeys) {
    const val = raw?.[key];
    out[key] = Array.isArray(val)
      ? val.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      : [];
  }
  out.deal_types = normalizeStringArray(raw?.deal_types);
  out.funding_stages = normalizeStringArray(raw?.funding_stages);
  return out;
}

interface EmailAlertsResponse {
  alerts: EmailAlert[];
  meta: EmailAlertsMeta;
}

const EMAIL_ALERTS_META: EmailAlertsMeta = {
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
    daily_send_time_local: "09:00",
  },
};

function buildFiltersPayload(filters: EmailAlertFilters | null | undefined) {
  const f = filters ?? {};
  return {
    companies: f.companies ?? [],
    sectors: f.sectors ?? [],
    individuals: f.individuals ?? [],
    investors: f.investors ?? [],
    advisors: f.advisors ?? [],
    deal_types: f.deal_types ?? [],
    funding_stages: f.funding_stages ?? [],
  };
}

class EmailAlertsService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; data?: unknown }
        | null;
      const detail =
        typeof body?.data === "string"
          ? body.data
          : body?.data != null
            ? JSON.stringify(body.data)
            : "";
      throw new Error(
        body?.error ||
          body?.message ||
          `API request failed: ${response.statusText}${detail ? ` - ${detail}` : ""}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async getEmailAlerts(): Promise<EmailAlertsResponse> {
    const response = await this.request<EmailAlert[]>("/api/email-alerts", {
      method: "GET",
    });

    const rawAlerts = Array.isArray(response) ? response : [];
    const alerts: EmailAlert[] = rawAlerts.map((a) => ({
      ...a,
      filters: normalizeFilters(a.filters),
    }));

    return { alerts, meta: EMAIL_ALERTS_META };
  }

  async createEmailAlert(alert: EmailAlert, email?: string): Promise<EmailAlert> {
    const timezone = alert.timezone || "Europe/London";
    const filtersPayload = buildFiltersPayload(alert.filters);

    const body: Record<string, unknown> = {
      user_id: alert.user_id,
      email: email?.trim() || undefined,
      item_type: alert.item_type,
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week || "",
      timezone,
      content_type: alert.content_type || "",
      is_active: alert.is_active,
      send_time_local: alert.send_time_local ?? null,
      filters: filtersPayload,
    };

    if (alert.email_frequency === "as_added") {
      body.day_of_week = "";
      body.send_time_local = null;
      if (alert.item_type !== "insights_analysis") {
        body.content_type = "";
      }
    }

    if (alert.item_type === "digest") {
      body.content_type = "";
    }

    const response = await this.request<EmailAlert>("/api/email-alerts", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      ...response,
      filters: normalizeFilters(response.filters),
    };
  }

  async updateEmailAlert(alert: EmailAlert): Promise<EmailAlert> {
    const timezone = alert.timezone || "Europe/London";
    const filtersPayload = buildFiltersPayload(alert.filters);

    const body: Record<string, unknown> = {
      item_type: alert.item_type,
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week || "",
      timezone,
      content_type: alert.content_type || "",
      is_active: alert.is_active,
      send_time_local: alert.send_time_local || null,
      filters: filtersPayload,
    };

    if (alert.email_frequency === "as_added") {
      body.day_of_week = "";
      body.send_time_local = null;
    }

    if (alert.item_type === "digest") {
      body.content_type = "";
    }

    const response = await this.request<EmailAlert>(
      `/api/email-alerts/${alert.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return {
      ...response,
      filters: normalizeFilters(response.filters),
    };
  }

  async patchEmailAlert(
    alertId: number,
    patch: Record<string, unknown>
  ): Promise<EmailAlert> {
    const response = await this.request<EmailAlert>(
      `/api/email-alerts/${alertId}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      }
    );

    return {
      ...response,
      filters: normalizeFilters(response.filters),
    };
  }

  async deleteEmailAlert(alertId: number): Promise<void> {
    await this.request<void>(`/api/email-alerts/${alertId}`, {
      method: "DELETE",
    });
  }
}

export const emailAlertsService = new EmailAlertsService();
