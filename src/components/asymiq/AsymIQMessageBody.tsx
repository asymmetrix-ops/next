"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { EntityChip, type EntityKind } from "@/components/ui/EntityChip";
import { getInsightsTypeTone, pillStyleFromTone } from "@/lib/tagColors";
import type {
  AsymIQCard,
  AsymIQChoice,
  AsymIQEntity,
  AsymIQListLink,
} from "@/lib/asymiq";

export type AsymIQAssistantPayload = {
  content: string;
  entities?: AsymIQEntity[];
  choices?: AsymIQChoice[];
  listLinks?: AsymIQListLink[];
  suggestions?: string[];
  cards?: AsymIQCard[];
  actions?: string[];
};

const CHIP_TITLE = "asymiq-entity";
const LOGO_TYPES = new Set(["company", "investor", "advisor"]);
const KIND_BY_TYPE: Record<string, EntityKind> = {
  company: "company",
  investor: "investor",
  advisor: "advisor",
  individual: "individual",
  sector: "sector",
  sub_sector: "subsector",
};
const CONTRIBUTE_HREF =
  "mailto:asymmetrix@asymmetrixintelligence.com?subject=Contribute%20Data&body=Please%20describe%20the%20data%20you%20would%20like%20to%20contribute.";

/** Replace validated [[type:id|Name]] markers with markdown links rendered as platform chips. */
function linkifyEntities(content: string, entities: AsymIQEntity[]): string {
  let out = content;
  for (const e of entities) {
    const label = e.name.replace(/[[\]]/g, "");
    out = out.split(e.raw).join(`[${label}](${e.url} "${CHIP_TITLE}")`);
  }
  return out;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="ax-eyebrow mb-1.5" style={{ fontSize: 10.5 }}>
      {children}
    </div>
  );
}

function PillLabel({ entity, name }: { entity: AsymIQEntity; name: string }) {
  return (
    <>
      {LOGO_TYPES.has(entity.type) ? (
        <CompanyAvatar name={name} logo={entity.logo} size={14} />
      ) : null}
      <span>{name}</span>
    </>
  );
}

function InlineEntity({
  entity,
  fallback,
}: {
  entity?: AsymIQEntity;
  fallback: React.ReactNode;
}) {
  const kind = entity ? KIND_BY_TYPE[entity.type] : undefined;
  if (!entity || !kind) {
    // events / articles: plain platform link, no chip family
    return (
      <Link
        href={entity?.url ?? "#"}
        className="font-semibold text-[var(--fg-link)] hover:underline"
      >
        {fallback}
      </Link>
    );
  }
  return (
    <EntityChip
      kind={kind}
      href={entity.url}
      label={<PillLabel entity={entity} name={entity.name} />}
      style={{ verticalAlign: "middle", margin: "0 2px" }}
    />
  );
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Country: Germany" -> ["Country", "Germany"]; lines without a label stay whole. */
function splitApplied(line: string): [string | null, string] {
  const i = line.indexOf(": ");
  return i > 0 ? [line.slice(0, i), line.slice(i + 2)] : [null, line];
}

const secondaryBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-1)] bg-white px-3 text-[12.5px] font-semibold text-[var(--fg-1)] no-underline transition-colors hover:bg-[var(--bg-3)] disabled:opacity-50";

export default function AsymIQMessageBody({
  payload,
  onChoose,
  onSuggest,
  disabled,
}: {
  payload: AsymIQAssistantPayload;
  onChoose: (choice: AsymIQChoice) => void;
  onSuggest: (text: string) => void;
  disabled: boolean;
}) {
  const entities = payload.entities ?? [];
  const byUrl = new Map(entities.map((e) => [e.url, e]));
  const md = linkifyEntities(payload.content, entities);

  return (
    <div>
      <div className="asymiq-markdown text-[13px] leading-[1.6] text-[var(--fg-2)] [&_a]:font-semibold [&_a]:text-[var(--fg-link)] [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-[14px] [&_h1]:font-bold [&_h1]:text-[var(--fg-1)] [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-[var(--fg-1)] [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-[var(--fg-1)] [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, title, children }) =>
              title === CHIP_TITLE && href ? (
                <InlineEntity entity={byUrl.get(href)} fallback={children} />
              ) : (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
          }}
        >
          {md}
        </ReactMarkdown>
      </div>

      {payload.choices && payload.choices.length > 0 ? (
        <div className="mt-3">
          <Eyebrow>Which one do you mean?</Eyebrow>
          <div className="overflow-hidden rounded-lg border border-[var(--border-1)] bg-white">
            {payload.choices.map((c, i) => (
              <button
                key={`${c.type}-${c.id}`}
                type="button"
                disabled={disabled}
                onClick={() => onChoose(c)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg-3)] disabled:opacity-50 ${
                  i > 0 ? "border-t border-[var(--border-1)]" : ""
                }`}
              >
                {LOGO_TYPES.has(c.type) ? (
                  <CompanyAvatar name={c.name} logo={c.logo} size={22} />
                ) : null}
                <span className="min-w-0 flex-1 truncate font-semibold text-[var(--fg-1)]">
                  {c.name}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--fg-link)]">
                  Select →
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(payload.listLinks ?? []).map((l, i) => {
        const sortLine = l.summary
          .split(" | ")
          .find((part) => part.startsWith("Sorted by "))
          ?.replace("Sorted by ", "");
        return (
          <div
            key={`${l.url}-${i}`}
            className="mt-3 overflow-hidden rounded-lg border border-[var(--border-1)] bg-white"
          >
            <div className="border-b border-[var(--border-1)] bg-[var(--bg-2)] px-3 py-1.5">
              <div className="ax-eyebrow" style={{ fontSize: 10.5 }}>
                Filters to be applied
              </div>
            </div>
            <div className="px-3 py-2.5">
              <dl className="m-0 space-y-1.5">
                {l.applied.map((line) => {
                  const [k, v] = splitApplied(line);
                  return (
                    <div key={line} className="flex gap-2 text-[12.5px]">
                      {k ? (
                        <dt className="w-[38%] shrink-0 text-[var(--fg-3)]">{k}</dt>
                      ) : null}
                      <dd className="m-0 min-w-0 flex-1 font-semibold text-[var(--fg-1)]">
                        {v}
                      </dd>
                    </div>
                  );
                })}
                {sortLine ? (
                  <div className="flex gap-2 text-[12.5px]">
                    <dt className="w-[38%] shrink-0 text-[var(--fg-3)]">Sort</dt>
                    <dd className="m-0 min-w-0 flex-1 font-semibold text-[var(--fg-1)]">
                      {sortLine}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {l.applied.length === 0 && !sortLine ? (
                <p className="m-0 text-[12.5px] text-[var(--fg-3)]">
                  No filters — the full list will open.
                </p>
              ) : null}
              {l.rejected.length > 0 ? (
                <div
                  className="mt-2 rounded-md px-2.5 py-1.5 text-[11.5px] leading-snug"
                  style={{ background: "#FBF1DE", color: "#8A5A06" }}
                >
                  Could not apply:{" "}
                  {l.rejected
                    .map(
                      (r) =>
                        `${r.filter ?? "filter"}${r.value ? ` “${r.value}”` : ""} (${r.reason})`
                    )
                    .join("; ")}
                </div>
              ) : null}
            </div>
            <div className="border-t border-[var(--border-1)] bg-[var(--bg-2)] px-3 py-2.5">
              {l.note ? (
                <p className="m-0 mb-2 text-[11px] leading-snug text-[var(--fg-3)]">
                  {l.note}
                </p>
              ) : null}
              <Link
                href={l.url}
                className="flex h-9 w-full items-center justify-center rounded-lg bg-[var(--ax-cyan-600)] px-3 text-center text-[13px] font-semibold text-white no-underline shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--ax-cyan-700)]"
              >
                {l.label}
              </Link>
            </div>
          </div>
        );
      })}

      {payload.cards && payload.cards.length > 0 ? (
        <div className="mt-3">
          <Eyebrow>Related reading</Eyebrow>
          <div className="space-y-2">
            {payload.cards.map((c) => {
              const tone = getInsightsTypeTone(
                c.kind === "News" ? "news" : c.type
              );
              return (
                <Link
                  key={c.id}
                  href={c.url}
                  className="block rounded-lg border border-[var(--border-1)] bg-white px-3 py-2.5 no-underline transition-colors hover:bg-[var(--bg-2)]"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span style={pillStyleFromTone(tone)}>
                      {c.kind === "News" ? "News" : c.type || "Insights & Analysis"}
                    </span>
                    {c.date ? (
                      <span className="text-[11px] text-[var(--fg-3)]">
                        {formatDate(c.date)}
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--fg-1)]">
                    {c.title}
                  </p>
                  <span className="mt-1 inline-block text-[12px] font-semibold text-[var(--fg-link)]">
                    Read more →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {payload.actions?.includes("contribute_data") ? (
        <div className="mt-3">
          <a href={CONTRIBUTE_HREF} className={secondaryBtn}>
            <span aria-hidden className="text-[14px] leading-none">+</span>
            Contribute Data
          </a>
        </div>
      ) : null}

      {payload.suggestions && payload.suggestions.length > 0 ? (
        <div className="mt-3 border-t border-[var(--border-1)] pt-2.5">
          <Eyebrow>Suggested follow-ups</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {payload.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onSuggest(s)}
                className="rounded-full border border-[var(--ax-cyan-300)] bg-[var(--ax-cyan-100)] px-3 py-1 text-left text-[12px] font-semibold text-[var(--ax-cyan-700)] transition-colors hover:border-[var(--ax-cyan-600)] hover:bg-[var(--ax-cyan-600)] hover:text-white disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
