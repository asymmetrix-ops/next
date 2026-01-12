import { authService } from "./auth";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { computeNextRunAtUtcIso } from "@/utils/emailAlertSchedule";

interface EmailAlertsResponse {
  alerts: EmailAlert[];
  meta: EmailAlertsMeta;
}

class EmailAlertsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:1-YVocmu";
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
        authService.logout();
        window.location.href = "/login";
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
    const alerts = Array.isArray(response) ? response : [];

    // For now, we'll use the hardcoded enums from the user's description
    // In the future, this might come from a separate endpoint
    const meta: EmailAlertsMeta = {
      enums: {
        item_type: [
          { value: "corporate_events", label: "Corporate Events" },
          { value: "insights_analysis", label: "Insights & Analysis" },
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
    const nextRunAtUtcMs =
      nextRunAtUtcIso == null ? null : new Date(nextRunAtUtcIso).getTime();

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
      next_run_at_utc: alert.email_frequency === "as_added" ? null : nextRunAtUtcMs,
      status: "scheduled",
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

