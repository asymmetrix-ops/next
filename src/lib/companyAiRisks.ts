import type { AIRiskAxis } from "@/components/redesign/AIRiskCard";
import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

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
  {
    key: "talent",
    label: "Talent",
    match: (f) => f.includes("talent"),
  },
];

/** Educational copy shown when hovering radar axis labels. */
export const AI_EXPOSURE_FACTOR_DESCRIPTIONS: Record<string, string> = {
  data_moat:
    "The strongest data businesses own something a competitor cannot simply acquire elsewhere; AI cannot be used to easily obtain this data, as it comes from a source outside the reach of AI tools. The first test is whether the underlying data is genuinely proprietary — first-party, exclusively licensed, or generated through the company's own operations — rather than scraped from the open web or assembled from sources anyone could equally reach. Even where the raw inputs are commodity, the work of cleansing, structuring and organising data in a proprietary manner can itself create a moat, turning a raw feed into a refined asset.",
  replic:
    "Closely related, but distinct. Even where data is not strictly proprietary, defensibility depends on how readily a dataset can be replicated or approximated. AI has sharply lowered the cost of collecting “good enough” data or replicating a dataset with similar data or approximate the data with a similar dataset. What matters is whether a competitor — or a client armed with off-the-shelf AI tools — could approximate the dataset closely enough to offer clients a compelling enough product.",
  workflow:
    "Data rarely creates value in isolation. The most defensible companies embed their data and software inside a specific client workflow, purpose-built so the product answers a particular question or supports a particular task better than any general-purpose alternative. This integration creates switching costs and habituation that raw data alone cannot, and it is far harder for a generic AI tool to dislodge a product woven into a daily process or embedded deeply into client workflows than one that simply supplies information.",
  stakes:
    "Not all data carries equal weight. A dataset that underpins a critical, high-stakes or expensive decision commands a premium that one supporting routine choices does not. Where the data is genuinely essential to making that decision — and where getting it wrong is costly — clients are far less willing to risk a cheaper or unproven substitute built by AI. Both dimensions matter: the magnitude of the decisions the data informs, and how central the data is to reaching them.",
  authority:
    "Some companies become the reference point for their industry — the dataset others cite, benchmark against and build upon. This status is hard-won and harder to dislodge, resting on trust, track record and network adoption rather than technology alone. Where a company is treated as the authoritative source of truth, an AI-native challenger faces not only a technical hurdle but a credibility one, which is the slower and more expensive of the two to overcome.",
  accuracy:
    "The value of accuracy depends entirely on the cost of error in the workflow the data feeds. Where inaccurate data leads to missed revenue, costly operational mistakes or regulatory violations and fines, tolerance for error approaches zero, and clients will pay a premium for reliability they can trust. AI-generated approximations or data collected solely by AI agents with minimal human-in-the-loop guidance, however plausible they appear, struggle to compete where precision is non-negotiable and a single error is expensive to absorb.",
  history:
    "Time-series data that can no longer be collected is, by definition, irreplaceable. Where a company's dataset captures history that competitors cannot retroactively assemble — and where that history is essential to the end-user's workflow — it holds an asset no amount of computing power can recreate. AI can model the future from the past, but it cannot manufacture a past that was never recorded.",
  human:
    "The hardest capability for AI to replicate is informed human judgement. Where a company's content incorporates or requires expert editorial input — analysis, curation or interpretation, such as a PRA-style review — that materially improves the value of the underlying information, it adds a layer of defensibility pure automation (like that of AI-native data companies) cannot easily match. The question is how much of the value derives from this human-in-the-loop expertise, and whether clients are paying for the judgement as much as the data.",
  talent:
    "Finally, defensibility is partly a function of the team. We look for “mad CTO”-type leadership and an innovative product organisation that treats AI as an opportunity rather than a threat — integrating it across both front-end and back-end processes to widen the moat rather than waiting for a competitor to erode it. The most defensible data businesses are those building with AI faster than AI can commoditise them.",
};

export function getAiExposureFactorDescription(key: string): string | undefined {
  return AI_EXPOSURE_FACTOR_DESCRIPTIONS[key];
}

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

const COMPANY_AI_RISKS_V2_BASE = `${COMPANIES_API_BASE}/company_ai_risks_v2`;

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
    blurb: decodeHtmlEntities(item.body ?? ""),
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
    const row = pickBestCompanyAiRiskRecord(data);
    if (isCompanyAiRiskRecord(row)) {
      return mapCompanyAiRiskRecordToData(row);
    }
    return mapAiRisksV2ToData(data as CompanyAiRiskV2Factor[]);
  }
  if (data && typeof data === "object") {
    if (isCompanyAiRiskRecord(data)) {
      return mapCompanyAiRiskRecordToData(data);
    }
    if ("factors" in data) {
      return mapAiRisksV2ToData(data as CompanyAiRiskV2Response);
    }
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

export type CompanyAiRiskRationale = {
  data_moat?: string | null;
  replicability?: string | null;
  authority?: string | null;
  accuracy_matters?: string | null;
  historical_data?: string | null;
  value_at_stake?: string | null;
  workflow_moat?: string | null;
  human_judgement?: string | null;
};

export type CompanyAiRiskRecord = {
  id?: number;
  created_at?: number;
  company?: number;
  risk?: CompanyAiRiskScores | null;
  defense?: CompanyAiRiskScores | null;
  rationale?: CompanyAiRiskRationale | null;
};

const COMPANY_AI_RISKS_BASE = `${COMPANIES_API_BASE}/company_ai_risks`;

type AxisMeta = {
  key: string;
  label: string;
  scoreKey?: keyof CompanyAiRiskScores;
  rationaleKey: keyof CompanyAiRiskRationale;
  blurb: string;
};

const AXIS_META: AxisMeta[] = [
  {
    key: "data_moat",
    label: "Data Moat",
    scoreKey: "data_moat",
    rationaleKey: "data_moat",
    blurb: "Strength of proprietary or hard-to-replicate data assets.",
  },
  {
    key: "replic",
    label: "Replicability",
    scoreKey: "replicability",
    rationaleKey: "replicability",
    blurb:
      "Measures how easily AI could replicate this capability without proprietary inputs or relationships.",
  },
  {
    key: "authority",
    label: "Authority / Source of Truth",
    scoreKey: "authority",
    rationaleKey: "authority",
    blurb:
      "Whether the dataset is treated as a primary source of truth for the use case.",
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    scoreKey: "accuracy_matters",
    rationaleKey: "accuracy_matters",
    blurb:
      "Reflects whether users require observed, high-fidelity outputs rather than modelled estimates.",
  },
  {
    key: "history",
    label: "Historical Data",
    scoreKey: "historical_data",
    rationaleKey: "historical_data",
    blurb:
      "Depth and continuity of historical records that cannot be recreated after the fact.",
  },
  {
    key: "stakes",
    label: "Size of Decision / Value at Stake",
    scoreKey: "value_at_stake",
    rationaleKey: "value_at_stake",
    blurb:
      "Captures the business impact if outputs are wrong — budgets, compliance, or strategic decisions at risk.",
  },
  {
    key: "workflow",
    label: "Workflow Moat",
    scoreKey: "workflow_moat",
    rationaleKey: "workflow_moat",
    blurb:
      "Embedded distribution and recurring use in customer workflows that deepen over time.",
  },
];

export function scoreTierLabel(score: number): string {
  return scoreToTierName(score);
}

function isCompanyAiRiskRecord(value: unknown): value is CompanyAiRiskRecord {
  if (!value || typeof value !== "object") return false;
  const scores =
    (value as CompanyAiRiskRecord).defense ??
    (value as CompanyAiRiskRecord).risk;
  if (!scores || typeof scores !== "object") return false;
  return (
    "replicability" in scores ||
    "data_moat" in scores ||
    "accuracy_matters" in scores
  );
}

/** Map a score-based API row to full radar card data. */
export function mapCompanyAiRiskRecordToData(
  record: CompanyAiRiskRecord | null | undefined
): CompanyAiRiskData | null {
  const axes = mapCompanyAiRisksToAxes(record);
  if (!axes) return null;

  const avgDefensibility =
    axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length;

  return {
    axes,
    avgDefensibility,
    tier: getAiExposureHeadline(avgDefensibility).label,
  };
}

function rationaleRichness(record: CompanyAiRiskRecord): number {
  const r = record.rationale;
  if (!r || typeof r !== "object") return 0;
  return Object.values(r).filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;
}

/** Prefer the row with the richest rationale, then the latest created_at. */
function pickBestCompanyAiRiskRecord(
  rows: unknown[]
): CompanyAiRiskRecord | undefined {
  const records = rows.filter(isCompanyAiRiskRecord);
  if (records.length === 0) return undefined;
  if (records.length === 1) return records[0];

  return records.reduce((best, row) => {
    const bestRichness = rationaleRichness(best);
    const rowRichness = rationaleRichness(row);
    if (rowRichness !== bestRichness) {
      return rowRichness > bestRichness ? row : best;
    }
    return (row.created_at ?? 0) > (best.created_at ?? 0) ? row : best;
  });
}

function resolveAxisBlurb(
  record: CompanyAiRiskRecord,
  meta: AxisMeta
): string {
  const rationaleText = record.rationale?.[meta.rationaleKey];
  if (typeof rationaleText === "string" && rationaleText.trim()) {
    return decodeHtmlEntities(rationaleText.trim());
  }
  return meta.blurb;
}

/** Map Xano `company_ai_risks` row to radar axes (defensibility scores only). */
export function mapCompanyAiRisksToAxes(
  record: CompanyAiRiskRecord | null | undefined
): AIRiskAxis[] | null {
  if (!record?.defense && !record?.risk) return null;

  const axes: AIRiskAxis[] = [];
  for (const meta of AXIS_META) {
    const raw = meta.scoreKey
      ? record.defense?.[meta.scoreKey] ?? record.risk?.[meta.scoreKey]
      : undefined;
    const hasScore = typeof raw === "number" && Number.isFinite(raw);
    if (!hasScore) continue;

    const score = normalizeToThreeScore(raw);
    axes.push({
      key: meta.key,
      label: meta.label,
      score,
      tier: scoreTierLabel(score),
      blurb: resolveAxisBlurb(record, meta),
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
