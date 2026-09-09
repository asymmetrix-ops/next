import {
  ADVISOR_ROLE_TAB_CONFIG,
  ADVISOR_ROLE_TAB_ORDER,
} from "@/components/advisors/advisorsFilterConfig";

export const ADVISOR_AREA_OF_FOCUS_LABELS = ADVISOR_ROLE_TAB_ORDER.map(
  (key) => ADVISOR_ROLE_TAB_CONFIG[key].label
);

const LABEL_TO_ROLE_ID = new Map(
  ADVISOR_ROLE_TAB_ORDER.map((key) => [
    ADVISOR_ROLE_TAB_CONFIG[key].label.toLowerCase(),
    ADVISOR_ROLE_TAB_CONFIG[key].roleId,
  ])
);

const ROLE_ID_TO_LABEL = new Map(
  ADVISOR_ROLE_TAB_ORDER.map((key) => [
    ADVISOR_ROLE_TAB_CONFIG[key].roleId,
    ADVISOR_ROLE_TAB_CONFIG[key].label,
  ])
);

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchAdvisorAreaOfFocusLabel(raw: string): string | null {
  const normalized = normalizeLabel(raw);
  if (!normalized) return null;

  for (const label of ADVISOR_AREA_OF_FOCUS_LABELS) {
    if (normalizeLabel(label) === normalized) return label;
  }

  for (const key of ADVISOR_ROLE_TAB_ORDER) {
    const config = ADVISOR_ROLE_TAB_CONFIG[key];
    const tabLabel = normalizeLabel(config.label);
    if (
      normalized.includes(tabLabel) ||
      tabLabel.includes(normalized) ||
      normalized.includes(key.replace(/_/g, " "))
    ) {
      return config.label;
    }
  }

  return null;
}

export function resolveAdvisorRoleIdsFromLabels(labels: string[]): number[] {
  const ids = new Set<number>();
  for (const label of labels) {
    const matched = matchAdvisorAreaOfFocusLabel(label);
    if (!matched) continue;
    const roleId = LABEL_TO_ROLE_ID.get(normalizeLabel(matched));
    if (roleId != null) ids.add(roleId);
  }
  return Array.from(ids);
}

function coerceRoleId(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function resolveAdvisorAreaOfFocusLabelsFromRoleIds(
  roleIds: Array<number | string>
): string[] {
  const labels = new Set<string>();
  for (const rawId of roleIds) {
    const id = Number(rawId);
    if (!Number.isFinite(id)) continue;
    const label = ROLE_ID_TO_LABEL.get(id);
    if (label) labels.add(label);
  }
  return Array.from(labels);
}

export function extractAdvisorAreaOfFocusLabels(
  raw: Record<string, unknown>
): string[] {
  const labels = new Set<string>();

  const addRawLabel = (value: unknown) => {
    if (typeof value !== "string") return;
    const matched = matchAdvisorAreaOfFocusLabel(value);
    if (matched) labels.add(matched);
  };

  const addRoleObject = (role: unknown) => {
    if (!role || typeof role !== "object") return;
    const obj = role as Record<string, unknown>;
    addRawLabel(obj.role_name);
    addRawLabel(obj.advisor_role);
    addRawLabel(obj.name);
    addRawLabel(obj.label);
    const roleId = coerceRoleId(obj.role_id ?? obj.advisor_role_id ?? obj.id);
    if (roleId != null) {
      resolveAdvisorAreaOfFocusLabelsFromRoleIds([roleId]).forEach((label) =>
        labels.add(label)
      );
    }
  };

  const roleSources = [
    raw._advisor_roles,
    raw.advisor_roles,
    raw.area_of_focus,
    raw.area_of_focuses,
    raw.advisor_types,
    raw.advisor_type,
  ];

  for (const source of roleSources) {
    if (Array.isArray(source)) {
      for (const entry of source) {
        if (typeof entry === "string") addRawLabel(entry);
        else addRoleObject(entry);
      }
      continue;
    }
    if (typeof source === "string") {
      source
        .split(/[,;|]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach(addRawLabel);
    }
  }

  const roleIdsRaw =
    raw.advisor_role_ids ??
    raw.advisor_role_ids_str ??
    raw.role_ids ??
    raw.advisor_role_id;
  if (roleIdsRaw != null) {
    const ids: Array<number | string> = Array.isArray(roleIdsRaw)
      ? roleIdsRaw
          .map(coerceRoleId)
          .filter((id): id is number | string => id != null)
      : String(roleIdsRaw)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
    resolveAdvisorAreaOfFocusLabelsFromRoleIds(ids).forEach((label) =>
      labels.add(label)
    );
  }

  return Array.from(labels);
}
