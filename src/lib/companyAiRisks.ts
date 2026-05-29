import type { AIRiskAxis, AIRiskAxisGroup } from "@/components/redesign/AIRiskCard";

// ── V2 API types ─────────────────────────────────────────────────────────────
export type CompanyAiRiskV2Item = {
  factor: string;
  assessment: string;
  body: string;
  risk_score: number;
  defense_score: number;
};

const COMPANY_AI_RISKS_V2_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_ai_risks_v2";

/**
 * Derive radar axis key + colour group from the factor label.
 * Risk factors (replicability, accuracy, stakes) sit in the red wedge;
 * defensibility factors (moats, authority, history) sit in the green wedge.
 */
function inferAxisMeta(
  factor: string
): { key: string; group: AIRiskAxisGroup; label: string } {
  const f = factor.toLowerCase();
  if (f.includes("replicab")) return { key: "replic", group: "risk", label: factor };
  if (f.includes("accuracy")) return { key: "accuracy", group: "risk", label: factor };
  if (f.includes("size") || f.includes("value at stake") || f.includes("decision"))
    return { key: "stakes", group: "risk", label: factor };
  if (f.includes("workflow")) return { key: "workflow", group: "def", label: factor };
  if (f.includes("authority")) return { key: "authority", group: "def", label: factor };
  if (f.includes("historical")) return { key: "history", group: "def", label: factor };
  if (f.includes("data moat")) return { key: "data", group: "def", label: factor };
  if (f.includes("human") || f.includes("expert") || f.includes("judgement"))
    return { key: "human", group: "def", label: factor };
  // Unknown factor: derive key from text, default def group
  const key = f.replace(/[^a-z0-9]/g, "").slice(0, 14) || "other";
  return { key, group: "def", label: factor };
}

function clampV2(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

/**
 * Map the v2 API response to radar axes.
 * We use defense_score as the radar score: higher = stronger defense against AI.
 * The assessment + body fields come directly from the API.
 */
export function mapAiRisksV2ToAxes(
  items: CompanyAiRiskV2Item[]
): AIRiskAxis[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const axes: AIRiskAxis[] = items.map((item) => {
    const { key, group, label } = inferAxisMeta(item.factor);
    return {
      key,
      label,
      group,
      score: clampV2(item.defense_score),
      tier: item.assessment,
      blurb: item.body.replace(/&nbsp;/g, " ").trim(),
    };
  });
  return axes.length >= 3 ? axes : null;
}

export async function fetchCompanyAiRisksV2(
  newCompanyId: string | number
): Promise<AIRiskAxis[] | null> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const params = new URLSearchParams({ new_company_id: String(newCompanyId) });
  const res = await fetch(`${COMPANY_AI_RISKS_V2_BASE}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return mapAiRisksV2ToAxes(data as CompanyAiRiskV2Item[]);
}

// ── V1 API types (legacy fallback) ───────────────────────────────────────────
export type CompanyAiRiskScores = {
  replicability?: number | null;
  accuracy_matters?: number | null;
  value_at_stake?: number | null;
  workflow_moat?: number | null;
  authority?: number | null;
  historical_data?: number | null;
  data_moat?: number | null;
};

export type CompanyAiRiskRecord = {
  id?: number;
  created_at?: number;
  company?: number;
  risk?: CompanyAiRiskScores | null;
  defense?: CompanyAiRiskScores | null;
};

const COMPANY_AI_RISKS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_ai_risks";

type AxisMeta = {
  key: string;
  label: string;
  group: AIRiskAxisGroup;
  apiKey: keyof CompanyAiRiskScores;
  blurb: string;
};

const AXIS_META: AxisMeta[] = [
  {
    key: "replic",
    label: "Replicability",
    group: "risk",
    apiKey: "replicability",
    blurb:
      "Measures how easily AI could replicate this capability without proprietary inputs or relationships.",
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    group: "risk",
    apiKey: "accuracy_matters",
    blurb:
      "Reflects whether users require observed, high-fidelity outputs rather than modelled estimates.",
  },
  {
    key: "stakes",
    label: "Value at Stake",
    group: "risk",
    apiKey: "value_at_stake",
    blurb:
      "Captures the business impact if outputs are wrong — budgets, compliance, or strategic decisions at risk.",
  },
  {
    key: "workflow",
    label: "Workflow Moat",
    group: "def",
    apiKey: "workflow_moat",
    blurb:
      "Embedded distribution and recurring use in customer workflows that deepen over time.",
  },
  {
    key: "authority",
    label: "Authority",
    group: "def",
    apiKey: "authority",
    blurb:
      "Whether the dataset is treated as a primary source of truth for the use case.",
  },
  {
    key: "history",
    label: "Historical Data",
    group: "def",
    apiKey: "historical_data",
    blurb:
      "Depth and continuity of historical records that cannot be recreated after the fact.",
  },
  {
    key: "data",
    label: "Data Moat",
    group: "def",
    apiKey: "data_moat",
    blurb:
      "Uniqueness of underlying data assets versus surveys, web traffic, or synthetic proxies.",
  },
];

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function scoreTierLabel(score: number, group: AIRiskAxisGroup): string {
  const s = Math.round(Math.min(5, Math.max(1, score)));
  if (group === "def") {
    if (s >= 5) return "Deep moat";
    if (s >= 4) return "Strong defensibility";
    if (s >= 3) return "Moderate defensibility";
    if (s >= 2) return "Limited moat";
    return "Weak moat";
  }
  if (s >= 5) return "Limited AI exposure";
  if (s >= 4) return "Moderate exposure";
  if (s >= 3) return "Selective exposure";
  if (s >= 2) return "Elevated exposure";
  return "High AI exposure";
}

/** Map Xano `company_ai_risks` row to radar axes (risk.* for risk group, defense.* for def group). */
export function mapCompanyAiRisksToAxes(
  record: CompanyAiRiskRecord | null | undefined
): AIRiskAxis[] | null {
  if (!record?.risk && !record?.defense) return null;

  const axes: AIRiskAxis[] = [];
  for (const meta of AXIS_META) {
    const raw =
      meta.group === "risk"
        ? record.risk?.[meta.apiKey]
        : record.defense?.[meta.apiKey];
    const score = clampScore(raw);
    if (score === null) continue;
    axes.push({
      key: meta.key,
      label: meta.label,
      group: meta.group,
      score,
      tier: scoreTierLabel(score, meta.group),
      blurb: meta.blurb,
    });
  }

  return axes.length >= 3 ? axes : null;
}

export async function fetchCompanyAiRisks(
  newCompanyId: string | number
): Promise<CompanyAiRiskRecord | null> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const params = new URLSearchParams();
  params.append("new_company_id", String(newCompanyId));

  let res = await fetch(`${COMPANY_AI_RISKS_BASE}?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    res = await fetch(COMPANY_AI_RISKS_BASE, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ new_company_id: Number(newCompanyId) }),
    });
  }

  if (!res.ok) return null;

  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    const row = data[0] as CompanyAiRiskRecord | undefined;
    return row && typeof row === "object" ? row : null;
  }
  if (data && typeof data === "object") {
    return data as CompanyAiRiskRecord;
  }
  return null;
}
