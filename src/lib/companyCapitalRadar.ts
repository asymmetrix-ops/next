export type CapitalRadarEntityType = "investor" | "strategic_buyer" | string;

export type CapitalRadarEntry = {
  id: number;
  entity_type: CapitalRadarEntityType;
  related_id: number;
  final_score?: string | number | null;
  rank_position?: number | null;
  confidence_flag?: string | null;
  why_selected?: string | null;
  sector_overlap_count?: number | null;
  peer_overlap_count?: number | null;
  name?: string | null;
  logo_url?: string | null;
  country?: string | null;
  city?: string | null;
  sectors?: string | null;
  last_investment_date?: string | null;
};

export type CompanyCapitalRadarResponse = {
  company_id?: number;
  investors?: CapitalRadarEntry[];
  strategic_buyers?: CapitalRadarEntry[];
  computed_at?: number | null;
  has_data?: boolean;
};

export function parseCapitalRadarScore(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export function parseSectorList(raw?: string | null): string[] {
  if (!raw?.trim()) return [];

  let s = raw.trim();
  if (s.startsWith("{") && s.endsWith("}")) {
    s = s.slice(1, -1);
  }

  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      const part = current.trim();
      if (part) out.push(part);
      current = "";
      continue;
    }
    current += ch;
  }

  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

export function formatCapitalRadarEntityType(
  entityType: CapitalRadarEntityType | null | undefined
): string {
  const key = String(entityType || "").trim().toLowerCase();
  if (key === "investor") return "Financial Investor";
  if (key === "strategic_buyer") return "Strategic Acquirer";
  return key ? key.replace(/_/g, " ") : "-";
}

export function formatCapitalRadarLocation(
  city?: string | null,
  country?: string | null
): string {
  const parts = [city, country]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export function formatLastInvestmentDate(
  date?: string | null
): string {
  if (!date?.trim()) return "-";

  const parsed = new Date(`${date.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.trim();

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `${months}mo ago`;
  }
  const years = Math.max(1, Math.floor(diffDays / 365));
  return `${years}y ago`;
}

export function formatConfidenceFlag(flag?: string | null): string {
  const raw = String(flag || "").trim();
  if (!raw) return "-";
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function fetchCompanyCapitalRadar(
  companyId: string | number,
  token?: string | null
): Promise<CompanyCapitalRadarResponse | null> {
  const authToken =
    token ??
    (typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `/api/company-capital-radar/${encodeURIComponent(String(companyId))}`,
    {
      method: "GET",
      headers,
      credentials: "include",
    }
  );

  if (response.status === 401) return null;
  if (!response.ok) return null;

  const data = (await response.json()) as CompanyCapitalRadarResponse;
  if (!data || typeof data !== "object") return null;
  return data;
}
