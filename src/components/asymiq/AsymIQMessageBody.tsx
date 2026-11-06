"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CompanyAvatar } from "@/components/CompanyAvatar";
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
const CONTRIBUTE_HREF =
  "mailto:asymmetrix@asymmetrixintelligence.com?subject=Contribute%20Data&body=Please%20describe%20the%20data%20you%20would%20like%20to%20contribute.";

/** Replace validated [[type:id|Name]] markers with markdown links rendered as chips. */
function linkifyEntities(content: string, entities: AsymIQEntity[]): string {
  let out = content;
  for (const e of entities) {
    const label = e.name.replace(/[[\]]/g, "");
    out = out.split(e.raw).join(`[${label}](${e.url} "${CHIP_TITLE}")`);
  }
  return out;
}

function EntityChip({
  entity,
  children,
}: {
  entity?: AsymIQEntity;
  children: React.ReactNode;
}) {
  const href = entity?.url ?? "#";
  return (
    <Link
      href={href}
      className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 align-baseline text-[13px] font-medium text-indigo-800 no-underline hover:border-indigo-300 hover:bg-indigo-50"
    >
      {entity && LOGO_TYPES.has(entity.type) ? (
        <CompanyAvatar name={entity.name} logo={entity.logo} size={16} />
      ) : null}
      <span>{children}</span>
    </Link>
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
      <div className="asymiq-markdown text-sm leading-relaxed [&_a]:text-indigo-700 [&_a]:underline [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, title, children }) =>
              title === CHIP_TITLE && href ? (
                <EntityChip entity={byUrl.get(href)}>{children}</EntityChip>
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
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            Select one to continue
          </p>
          <div className="flex flex-wrap gap-2">
            {payload.choices.map((c) => (
              <button
                key={`${c.type}-${c.id}`}
                type="button"
                disabled={disabled}
                onClick={() => onChoose(c)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50 disabled:opacity-50"
              >
                {LOGO_TYPES.has(c.type) ? (
                  <CompanyAvatar name={c.name} logo={c.logo} size={18} />
                ) : null}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(payload.listLinks ?? []).map((l, i) => (
        <div
          key={`${l.url}-${i}`}
          className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Filters that will be applied
          </p>
          {l.applied.length > 0 ? (
            <ul className="mb-2 list-disc pl-5 text-[13px] text-slate-800">
              {l.applied.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-[13px] text-slate-700">{l.summary}</p>
          )}
          {l.rejected.length > 0 ? (
            <p className="mb-2 text-[12px] text-amber-700">
              Could not apply:{" "}
              {l.rejected
                .map((r) => `${r.filter ?? "filter"}${r.value ? ` “${r.value}”` : ""} (${r.reason})`)
                .join("; ")}
            </p>
          ) : null}
          <Link
            href={l.url}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white no-underline hover:bg-indigo-700"
          >
            {l.label}
          </Link>
          {l.note ? (
            <p className="mt-2 text-[11px] text-slate-500">{l.note}</p>
          ) : null}
        </div>
      ))}

      {payload.cards && payload.cards.length > 0 ? (
        <div className="mt-3 space-y-2">
          {payload.cards.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-slate-700">
                  {c.kind === "News" ? "News" : c.type || "I&A"}
                </span>
                {c.date ? <span>{formatDate(c.date)}</span> : null}
              </div>
              <p className="text-[13px] font-semibold leading-snug text-slate-900">
                {c.title}
              </p>
              <Link
                href={c.url}
                className="mt-1 inline-block text-[13px] font-medium text-indigo-700 hover:underline"
              >
                Read more →
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {payload.actions?.includes("contribute_data") ? (
        <div className="mt-3">
          <a
            href={CONTRIBUTE_HREF}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 no-underline hover:bg-slate-50"
          >
            + Contribute Data
          </a>
        </div>
      ) : null}

      {payload.suggestions && payload.suggestions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {payload.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onSuggest(s)}
              className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[13px] text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
