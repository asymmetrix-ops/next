"use client";

import { EntityChip } from "@/components/ui/EntityChip";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import type { ThreadType } from "@/lib/newsThreads";

export interface ArticleThreadLink {
  type: ThreadType;
  key: string | number;
  label: string;
  iso2?: string | null;
}

function threadHref(type: ThreadType, key: string | number): string {
  return `/news/threads/${type}/${encodeURIComponent(String(key))}`;
}

function countryName(iso2: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso2.toUpperCase()) || iso2.toUpperCase();
  } catch {
    return iso2.toUpperCase();
  }
}

/** Builds the thread links for an article: company, sector, country and investor of focus. */
export function buildArticleThreadLinks(input: {
  company?: { id?: number | null; name?: string | null } | null;
  sectors?: Array<{ id: number; name: string }>;
  countryIso2?: string | null;
  investors?: Array<{ id?: number | null; name?: string | null }> | null;
}): ArticleThreadLink[] {
  const links: ArticleThreadLink[] = [];
  const seen = new Set<string>();
  const add = (link: ArticleThreadLink) => {
    const id = `${link.type}:${link.key}`;
    if (seen.has(id)) return;
    seen.add(id);
    links.push(link);
  };

  if (input.company?.id && input.company.name) {
    add({ type: "company", key: input.company.id, label: input.company.name });
  }
  for (const sector of input.sectors ?? []) {
    if (sector.id && sector.name) add({ type: "sector", key: sector.id, label: sector.name });
  }
  if (input.countryIso2) {
    const iso2 = input.countryIso2.toUpperCase();
    add({ type: "geography", key: iso2, label: countryName(iso2), iso2 });
  }
  for (const investor of input.investors ?? []) {
    if (investor?.id && investor.name) add({ type: "investor", key: investor.id, label: investor.name });
  }
  return links;
}

const KIND_BY_THREAD: Record<ThreadType, "company" | "sector" | "investor"> = {
  company: "company",
  sector: "sector",
  geography: "sector",
  investor: "investor",
};

/** "More on this" card: tags that open the matching News thread. */
export function ArticleThreadLinks({ links }: { links: ArticleThreadLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="card">
      <header>
        <h2>Threads</h2>
      </header>
      <div className="chipset">
        {links.map((link) => (
          <EntityChip
            key={`${link.type}:${link.key}`}
            kind={KIND_BY_THREAD[link.type]}
            href={threadHref(link.type, link.key)}
            title="Open thread"
            label={link.label}
          >
            {link.iso2 ? <CountryFlagImg iso2={link.iso2} size={14} /> : null}
          </EntityChip>
        ))}
      </div>
    </div>
  );
}
