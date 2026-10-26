"use client";

import { EntityChip } from "@/components/ui/EntityChip";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import type { ThreadType } from "@/lib/newsThreads";

/** `thread_links` from GET content/{id}: computed by the backend with the same rules as news/threads. */
export interface ArticleThreadLink {
  type: ThreadType;
  key: string | number;
  name: string;
}

function threadHref(type: ThreadType, key: string | number): string {
  return `/news/threads/${type}/${encodeURIComponent(String(key))}`;
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
            label={link.name}
          >
            {link.type === "geography" ? <CountryFlagImg iso2={String(link.key)} size={14} /> : null}
          </EntityChip>
        ))}
      </div>
    </div>
  );
}
