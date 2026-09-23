import { authService } from "./auth";

export interface NpsEligibilityResponse {
  eligible: boolean;
  [key: string]: unknown;
}

export type NpsRespondAction = "submit" | "dismiss" | "opt_out";

export interface NpsRespondPayload {
  action: NpsRespondAction;
  score?: number;
  comment?: string;
}

class NpsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_XANO_NPS_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:ia3IlHy1:develop";
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `NPS request failed: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    // Some endpoints (e.g. respond) may return an empty body.
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  async getEligibility(): Promise<NpsEligibilityResponse> {
    return this.request<NpsEligibilityResponse>("/nps/eligibility", {
      method: "GET",
    });
  }

  async respond(payload: NpsRespondPayload): Promise<unknown> {
    return this.request<unknown>("/nps/respond", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const npsService = new NpsService();
