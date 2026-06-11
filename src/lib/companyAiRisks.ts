import type { AIRiskAxis } from "@/components/redesign/AIRiskCard";

/** Low = 1, Moderate = 2, High = 3 */
export const AI_SCORE_MAX = 3;

export function scoreToTierName(score: number): string {
  const s = Math.round(Math.min(AI_SCORE_MAX, Math.max(1, score)));
  if (s === 1) return "Low";
  if (s === 2) return "Moderate";
  return "High";
}

/** Canonical order for the eight defensibility factors on the radar. */
const RADAR_FACTOR_ORDER: Array<{
  key: string;
  label: string;
  match: (factor: string) => boolean;
}> = [
  { key: "data_moat", label: "Data Moat", match: (f) => f.includes("data moat") },
  {
    key: "replic",
    label: "Replicability",
    match: (f) => f.includes("replicab"),
  },
  {
    key: "authority",
    label: "Authority / Source of Truth",
    match: (f) => f.includes("authority") || f.includes("source of truth"),
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    match: (f) => f.includes("accuracy"),
  },
  {
    key: "history",
    label: "Historical Data",
    match: (f) => f.includes("historical"),
  },
  {
    key: "stakes",
    label: "Size of Decision / Value at Stake",
    match: (f) =>
      f.includes("size of decision") ||
      f.includes("value at stake") ||
      (f.includes("decision") && f.includes("stake")),
  },
  {
    key: "human",
    label: "Human Judgement / Expert Commentary",
    match: (f) =>
      f.includes("human") || f.includes("expert") || f.includes("judgement"),
  },
  {
    key: "workflow",
    label: "Workflow Moat",
    match: (f) => f.includes("workflow"),
  },
];

const RADAR_AXIS_KEY_ORDER = Object.fromEntries(
  RADAR_FACTOR_ORDER.map((item, index) => [item.key, index])
) as Record<string, number>;

export function sortAiRiskAxesForRadar(axes: AIRiskAxis[]): AIRiskAxis[] {
  return [...axes].sort((a, b) => {
    const keyDelta =
      (RADAR_AXIS_KEY_ORDER[a.key] ?? 999) - (RADAR_AXIS_KEY_ORDER[b.key] ?? 999);
    if (keyDelta !== 0) return keyDelta;
    return a.label.localeCompare(b.label);
  });
}

/** Map API / legacy numeric or assessment text to a 1–3 tier score. */
export function normalizeToThreeScore(
  value: unknown,
  assessment?: string | null
): number {
  const text = (assessment ?? "").toLowerCase();
  if (text) {
    if (
      text.includes("low defensibility") ||
      text.includes("limited moat") ||
      text.includes("weak") ||
      /\blow\b/.test(text)
    )
      return 1;

    if (
      text.includes("moderate defensibility") ||
      /\bmoderate\b/.test(text) ||
      text.includes("selective") ||
      text.includes("partial") ||
      text.includes("medium")
    )
      return 2;

    if (
      text.includes("high defensibility") ||
      /\bhigh\b/.test(text) ||
      text.includes("strong") ||
      text.includes("deep")
    )
      return 3;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    if (n >= 1 && n <= AI_SCORE_MAX) return n;
    if (n >= 1 && n <= 5) {
      if (n <= 2) return 1;
      if (n === 3) return 2;
      return 3;
    }
  }

  return 2;
}

/** Tier thresholds based on average defensibility score only. */
export function getAiExposureHeadline(defAvg: number): {
  label: string;
  hint: string;
} {
  if (defAvg >= 2.5) {
    return {
      label: "Strong overall moat vs. AI",
      hint: "Shown when average defensibility is ≥ 2.5/3.",
    };
  }
  if (defAvg >= 2) {
    return {
      label: "Resilient — selective AI exposure",
      hint: "Shown when average defensibility is ≥ 2.0/3 and < 2.5/3.",
    };
  }
  if (defAvg >= 1.5) {
    return {
      label: "Moderate — partial exposure",
      hint: "Shown when average defensibility is ≥ 1.5/3 and < 2.0/3.",
    };
  }
  return {
    label: "Limited — AI substitution risk",
    hint: "Shown when average defensibility is below 1.5/3.",
  };
}

// ── V2 API types ─────────────────────────────────────────────────────────────
export type CompanyAiRiskV2Factor = {
  factor: string;
  assessment: string;
  body: string;
  defense_score: number;
};

export type CompanyAiRiskV2Response = {
  factors: CompanyAiRiskV2Factor[];
  avg_defense_score: number;
  tier: string;
};

export type CompanyAiRiskData = {
  axes: AIRiskAxis[];
  avgDefensibility: number;
  tier: string;
};

const COMPANY_AI_RISKS_V2_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_ai_risks_v2";

function inferAxisMeta(factor: string): { key: string; label: string } {
  const f = factor.toLowerCase();
  for (const item of RADAR_FACTOR_ORDER) {
    if (item.match(f)) return { key: item.key, label: item.label };
  }
  const key = f.replace(/[^a-z0-9]/g, "").slice(0, 14) || "other";
  return { key, label: factor };
}

function mapFactorToAxis(item: CompanyAiRiskV2Factor): AIRiskAxis {
  const { key, label } = inferAxisMeta(item.factor);
  const score = normalizeToThreeScore(item.defense_score, item.assessment);
  return {
    key,
    label,
    score,
    tier: scoreToTierName(score),
    blurb: item.body.replace(/&nbsp;/g, " ").trim(),
  };
}

/** Map the v2 API response to radar axes (1–3 defensibility scores). */
export function mapAiRisksV2ToData(
  response: CompanyAiRiskV2Response | CompanyAiRiskV2Factor[] | null | undefined
): CompanyAiRiskData | null {
  const factors = Array.isArray(response)
    ? response
    : response?.factors;
  if (!Array.isArray(factors) || factors.length === 0) return null;

  const axes = sortAiRiskAxesForRadar(factors.map(mapFactorToAxis));
  if (axes.length < 3) return null;

  const computedAvg =
    axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length;

  const avgDefensibility =
    !Array.isArray(response) &&
    typeof response?.avg_defense_score === "number" &&
    Number.isFinite(response.avg_defense_score)
      ? response.avg_defense_score
      : computedAvg;

  const tier =
    !Array.isArray(response) && typeof response?.tier === "string" && response.tier.trim()
      ? response.tier.trim()
      : getAiExposureHeadline(avgDefensibility).label;

  return { axes, avgDefensibility, tier };
}

/** @deprecated Use mapAiRisksV2ToData */
export function mapAiRisksV2ToAxes(
  response: CompanyAiRiskV2Response | CompanyAiRiskV2Factor[]
): AIRiskAxis[] | null {
  return mapAiRisksV2ToData(response)?.axes ?? null;
}

export async function fetchCompanyAiRisksV2(
  newCompanyId: string | number
): Promise<CompanyAiRiskData | null> {
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

  if (!res.ok) {
    throw new Error(`company_ai_risks_v2 failed: ${res.status}`);
  }

  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    return mapAiRisksV2ToData(data as CompanyAiRiskV2Factor[]);
  }
  if (data && typeof data === "object" && "factors" in data) {
    return mapAiRisksV2ToData(data as CompanyAiRiskV2Response);
  }
  return null;
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
  apiKey: keyof CompanyAiRiskScores;
  blurb: string;
};

const AXIS_META: AxisMeta[] = [
  {
    key: "data_moat",
    label: "Data Moat",
    apiKey: "data_moat",
    blurb: "Strength of proprietary or hard-to-replicate data assets.",
  },
  {
    key: "replic",
    label: "Replicability",
    apiKey: "replicability",
    blurb:
      "Measures how easily AI could replicate this capability without proprietary inputs or relationships.",
  },
  {
    key: "authority",
    label: "Authority / Source of Truth",
    apiKey: "authority",
    blurb:
      "Whether the dataset is treated as a primary source of truth for the use case.",
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    apiKey: "accuracy_matters",
    blurb:
      "Reflects whether users require observed, high-fidelity outputs rather than modelled estimates.",
  },
  {
    key: "history",
    label: "Historical Data",
    apiKey: "historical_data",
    blurb:
      "Depth and continuity of historical records that cannot be recreated after the fact.",
  },
  {
    key: "stakes",
    label: "Size of Decision / Value at Stake",
    apiKey: "value_at_stake",
    blurb:
      "Captures the business impact if outputs are wrong — budgets, compliance, or strategic decisions at risk.",
  },
  {
    key: "workflow",
    label: "Workflow Moat",
    apiKey: "workflow_moat",
    blurb:
      "Embedded distribution and recurring use in customer workflows that deepen over time.",
  },
];

export function scoreTierLabel(score: number): string {
  return scoreToTierName(score);
}

/** Map Xano `company_ai_risks` row to radar axes (defensibility scores only). */
export function mapCompanyAiRisksToAxes(
  record: CompanyAiRiskRecord | null | undefined
): AIRiskAxis[] | null {
  if (!record?.defense && !record?.risk) return null;

  const axes: AIRiskAxis[] = [];
  for (const meta of AXIS_META) {
    const raw =
      record.defense?.[meta.apiKey] ?? record.risk?.[meta.apiKey];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const score = normalizeToThreeScore(raw);
    axes.push({
      key: meta.key,
      label: meta.label,
      score,
      tier: scoreTierLabel(score),
      blurb: meta.blurb,
    });
  }

  return axes.length >= 3 ? sortAiRiskAxesForRadar(axes) : null;
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
