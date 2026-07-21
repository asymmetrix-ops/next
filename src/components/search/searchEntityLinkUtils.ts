import { normalizeSectorName } from "@/components/corporate-events/corporateEventsTableUtils";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";
import type { SectorNameIdMaps } from "@/components/search/useSectorNameIdMaps";

export function resolvePrimarySectorHref(
  name: string,
  maps?: Pick<SectorNameIdMaps, "primaryNameToId">
): string | undefined {
  const id = maps?.primaryNameToId[normalizeSectorName(name)];
  return typeof id === "number" ? `/sector/${id}` : undefined;
}

export function resolveSecondarySectorHref(
  name: string,
  maps?: Pick<SectorNameIdMaps, "secondaryNameToId">
): string | undefined {
  const id = maps?.secondaryNameToId[normalizeSectorName(name)];
  return typeof id === "number" ? `/sub-sector/${id}` : undefined;
}

export function resolveSectorHrefByName(
  name: string,
  maps?: SectorNameIdMaps
): string | undefined {
  if (!maps) return undefined;
  return (
    resolvePrimarySectorHref(name, maps) ??
    resolveSecondarySectorHref(name, maps)
  );
}

export function buildNamedSectorItems(
  names: string[],
  keyPrefix: string,
  maps?: SectorNameIdMaps
): SearchMultiValueItem[] {
  return names.flatMap((name, index) => {
    const label = name.trim();
    if (!label || label === "-") return [];
    return [
      {
        name: label,
        href: resolveSectorHrefByName(label, maps),
        key: `${keyPrefix}-${index}-${label}`,
      },
    ];
  });
}

export function getSectorInfoFromUnknown(
  sector: unknown
): { name: string; id?: number } {
  if (typeof sector === "string") return { name: sector.trim() };
  if (!sector || typeof sector !== "object") return { name: "" };
  const rec = sector as Record<string, unknown>;
  const nameRaw =
    (typeof rec.sector_name === "string" && rec.sector_name) ||
    (typeof rec.name === "string" && rec.name) ||
    "";
  const idRaw = rec.id ?? rec.sector_id ?? rec.sub_sector_id;
  const id = typeof idRaw === "number" ? idRaw : undefined;
  return { name: String(nameRaw).trim(), id };
}

export type AdvisorSectorRef = {
  id: number;
  name: string;
};

export function parseAdvisorSectors(value: unknown): AdvisorSectorRef[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const idRaw = rec.id ?? rec.sector_id ?? rec.sectors_id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string" && idRaw.trim() !== ""
        ? Number(idRaw)
        : undefined;
    const name = String(rec.name ?? rec.sector_name ?? "").trim();
    if (!id || !Number.isFinite(id) || !name) return [];
    return [{ id, name }];
  });
}

export function buildAdvisorSectorItems(
  sectors: unknown,
  keyPrefix = "advisor-sector"
): SearchMultiValueItem[] {
  return parseAdvisorSectors(sectors).map((sector, index) => ({
    name: sector.name,
    href: `/sector/${sector.id}`,
    key: `${keyPrefix}-${sector.id}-${index}`,
  }));
}

export function buildSectorItemsFromUnknown(
  sectors: unknown[] | undefined,
  kind: "primary" | "secondary",
  maps?: SectorNameIdMaps
): SearchMultiValueItem[] {
  if (!Array.isArray(sectors) || sectors.length === 0) return [];

  return sectors.flatMap((sector, index) => {
    const { name, id } = getSectorInfoFromUnknown(sector);
    if (!name) return [];

    let href =
      id != null
        ? kind === "primary"
          ? `/sector/${id}`
          : `/sub-sector/${id}`
        : undefined;

    if (!href && maps) {
      href =
        kind === "primary"
          ? resolvePrimarySectorHref(name, maps)
          : resolveSecondarySectorHref(name, maps);
    }

    return [
      {
        name,
        href,
        key: `${kind}-${id ?? name}-${index}`,
      },
    ];
  });
}

export type AdvisedEntityRef = {
  role?: string;
  company_id?: number;
  company_name: string;
  corporate_event_id: number;
};

export function parseAdvisedEntities(value: unknown): AdvisedEntityRef[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const companyName = String(
      rec.company_name ?? rec.companyName ?? rec.name ?? ""
    ).trim();
    const eventIdRaw = rec.corporate_event_id ?? rec.corporateEventId ?? rec.event_id;
    const eventId =
      typeof eventIdRaw === "number"
        ? eventIdRaw
        : typeof eventIdRaw === "string" && eventIdRaw.trim() !== ""
        ? Number(eventIdRaw)
        : undefined;
    if (!companyName || !eventId || !Number.isFinite(eventId)) return [];

    const companyIdRaw = rec.company_id ?? rec.companyId;
    const companyId =
      typeof companyIdRaw === "number"
        ? companyIdRaw
        : typeof companyIdRaw === "string" && companyIdRaw.trim() !== ""
        ? Number(companyIdRaw)
        : undefined;
    const role =
      typeof rec.role === "string" && rec.role.trim() ? rec.role.trim() : undefined;

    return [
      {
        role,
        company_id: companyId,
        company_name: companyName,
        corporate_event_id: eventId,
      },
    ];
  });
}

export function buildAdvisedEntityItems(
  entities: AdvisedEntityRef[],
  keyPrefix = "advised-entity"
): SearchMultiValueItem[] {
  return entities.flatMap((entity, index) => {
    const name = entity.company_name.trim();
    if (!name || !entity.corporate_event_id) return [];
    return [
      {
        name,
        href: `/corporate-event/${entity.corporate_event_id}`,
        key: `${keyPrefix}-${entity.corporate_event_id}-${index}`,
      },
    ];
  });
}
