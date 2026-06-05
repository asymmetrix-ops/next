import type { AIRiskAxis, AIRiskAxisGroup } from "@/components/redesign/AIRiskCard";

/** Low = 1, Moderate = 2, High = 3 */
export const AI_SCORE_MAX = 3;

export function scoreToTierName(score: number): string {
  const s = Math.round(Math.min(AI_SCORE_MAX, Math.max(1, score)));
  if (s === 1) return "Low";
  if (s === 2) return "Moderate";
  return "High";
}

/** Risk (red) axes first, then defensibility (green) — contiguous wedges on the radar. */
const RADAR_GROUP_ORDER: Record<AIRiskAxisGroup, number> = { risk: 0, def: 1 };

const RADAR_AXIS_KEY_ORDER: Record<string, number> = {
  replic: 0,
  accuracy: 1,
  stakes: 2,
  workflow: 3,
  authority: 4,
  history: 5,
  data: 6,
  human: 7,
};

export function sortAiRiskAxesForRadar(axes: AIRiskAxis[]): AIRiskAxis[] {
  return [...axes].sort((a, b) => {
    const groupDelta =
      (RADAR_GROUP_ORDER[a.group] ?? 0) - (RADAR_GROUP_ORDER[b.group] ?? 0);
    if (groupDelta !== 0) return groupDelta;
    const keyDelta =
      (RADAR_AXIS_KEY_ORDER[a.key] ?? 999) - (RADAR_AXIS_KEY_ORDER[b.key] ?? 999);
    if (keyDelta !== 0) return keyDelta;
    return a.label.localeCompare(b.label);
  });
}

/** Map API / legacy numeric or assessment text to a 1–3 tier score. */
export function normalizeToThreeScore(
  value: unknown,
  assessment?: string | null,
  group?: AIRiskAxisGroup
): number {
  const text = (assessment ?? "").toLowerCase();
  if (text) {
    if (
      text.includes("limited risk") ||
      text.includes("low exposure") ||
      text.includes("limited ai exposure") ||
      (group === "risk" && /\blow\b/.test(text)) ||
      (group === "def" &&
        (text.includes("weak") ||
          text.includes("limited moat") ||
          /\blow\b/.test(text)))
    )
      return 1;

    if (
      /\bmoderate\b/.test(text) ||
      text.includes("selective") ||
      text.includes("partial") ||
      text.includes("medium")
    )
      return 2;

    if (
      /\bhigh\b/.test(text) ||
      text.includes("strong") ||
      text.includes("deep") ||
      text.includes("elevated exposure") ||
      (group === "risk" && text.includes("elevated"))
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
  const key = f.replace(/[^a-z0-9]/g, "").slice(0, 14) || "other";
  return { key, group: "def", label: factor };
}

/**
 * Map the v2 API response to radar axes (1–3 tier scores).
 * Risk-group factors use `risk_score`; defensibility factors use `defense_score`.
 */
export function mapAiRisksV2ToAxes(
  items: CompanyAiRiskV2Item[]
): AIRiskAxis[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const axes: AIRiskAxis[] = items.map((item) => {
    const { key, group, label } = inferAxisMeta(item.factor);
    const rawScore = group === "risk" ? item.risk_score : item.defense_score;
    const score = normalizeToThreeScore(rawScore, item.assessment, group);
    return {
      key,
      label,
      group,
      score,
      tier: scoreToTierName(score),
      blurb: item.body.replace(/&nbsp;/g, " ").trim(),
    };
  });
  return axes.length >= 3 ? sortAiRiskAxesForRadar(axes) : null;
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

export function scoreTierLabel(score: number): string {
  return scoreToTierName(score);
}

/** Map Xano `company_ai_risks` row to radar axes (1–3 tier scores). */
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
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const score = normalizeToThreeScore(raw, undefined, meta.group);
    axes.push({
      key: meta.key,
      label: meta.label,
      group: meta.group,
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
