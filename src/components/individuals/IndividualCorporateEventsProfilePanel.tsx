"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  profileTableColAlign,
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
} from "@/components/redesign/primitives";
import { DealTypeBadge } from "@/components/corporate-events/DealTypeBadge";
import { formatCurrency, formatDate } from "@/utils/individualHelpers";
import type { CorporateEvent } from "@/types/individual";

type Props = {
  events: CorporateEvent[];
  individualId: number;
  otherIndividualNames: Record<number, string>;
  maxInitial?: number;
};

const EVENTS_ROW_GRID =
  "minmax(0, 1.1fr) minmax(80px, auto) minmax(92px, auto) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(80px, auto) minmax(0, 0.9fr) minmax(0, 0.9fr)";

const COL_GAP = 8;

export function IndividualCorporateEventsProfilePanel({
  events,
  individualId,
  otherIndividualNames,
  maxInitial = 5,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const headerRight = useMemo(() => {
    if (events.length === 0) return "";
    return `${events.length} event${events.length === 1 ? "" : "s"}`;
  }, [events.length]);

  const displayed = showAll ? events : events.slice(0, maxInitial);

  return (
    <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>
          Corporate Events
        </div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 900, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: EVENTS_ROW_GRID,
              gap: COL_GAP,
              padding: "8px 16px",
            }}
          >
            {(
              [
                "Description",
                "Date",
                "Type",
                "Target",
                "Other CP",
                "EV",
                "Individuals",
                "Advisors",
              ] as const
            ).map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: profileTableColAlign(colIndex),
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((event, index) => {
              const last = index === displayed.length - 1;
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);
              const dealType = event.deal_type || "-";
              const target = event._target_counterparty_of_corporate_events;
              const otherCp = event._other_counterparties_of_corporate_events || [];
              const ev =
                event.ev_data?.enterprise_value_m &&
                event.ev_data?._currency?.Currency
                  ? formatCurrency(
                      event.ev_data.enterprise_value_m,
                      event.ev_data._currency.Currency
                    )
                  : "-";

              const others =
                event._related_to_corporate_event_individuals?.filter(
                  (ind) => ind.id !== individualId
                ) || [];

              const advisors = event._related_advisor_to_corporate_events || [];

              return (
                <div
                  key={event.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: EVENTS_ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ textAlign: colAlign(0), minWidth: 0 }}>
                    <Link
                      href={`/corporate-event/${event.id}`}
                      prefetch={false}
                      style={{
                        color: T.azure,
                        textDecoration: "underline",
                        fontWeight: 500,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      {event.description || "-"}
                    </Link>
                  </div>
                  <div style={{ textAlign: colAlign(1), color: T.body, whiteSpace: "nowrap" }}>
                    {formatDate(event.announcement_date)}
                  </div>
                  <div style={{ textAlign: colAlign(2) }}>
                    {dealType && dealType !== "-" ? (
                      <DealTypeBadge dealType={dealType} />
                    ) : (
                      "-"
                    )}
                  </div>
                  <div style={{ textAlign: colAlign(3), color: T.body, minWidth: 0 }}>
                    {target?.name || "-"}
                  </div>
                  <div style={{ textAlign: colAlign(4), color: T.body, minWidth: 0 }}>
                    {otherCp.length > 0
                      ? otherCp.map((cp) => cp.name || "-").join(", ")
                      : "-"}
                  </div>
                  <div style={{ textAlign: colAlign(5), color: T.body, fontFamily: T.mono }}>
                    {ev}
                  </div>
                  <div style={{ textAlign: colAlign(6), color: T.muted, minWidth: 0 }}>
                    {others.length > 0
                      ? others.map((ind, i) => (
                          <span key={`${ind.id}-${i}`}>
                            <Link
                              href={`/individual/${ind.id}`}
                              prefetch={false}
                              style={{ color: T.azure, textDecoration: "underline" }}
                            >
                              {otherIndividualNames[ind.id] ||
                                ind.advisor_individuals ||
                                `Individual ${ind.id}`}
                            </Link>
                            {i < others.length - 1 ? ", " : ""}
                          </span>
                        ))
                      : "-"}
                  </div>
                  <div style={{ textAlign: colAlign(7), color: T.muted, minWidth: 0 }}>
                    {advisors.length > 0
                      ? advisors.map((advisor, i) => (
                          <span key={`${advisor._new_company?.id}-${i}`}>
                            {advisor._new_company?.id ? (
                              <Link
                                href={`/advisor/${advisor._new_company.id}`}
                                prefetch={false}
                                style={{ color: T.azure, textDecoration: "underline" }}
                              >
                                {advisor._new_company.name}
                              </Link>
                            ) : (
                              advisor._new_company?.name || "-"
                            )}
                            {i < advisors.length - 1 ? ", " : ""}
                          </span>
                        ))
                      : "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "20px 16px",
                color: T.muted,
                fontSize: "12.5px",
                textAlign: "center",
              }}
            >
              No corporate events available
            </div>
          )}
        </div>
      </div>

      {events.length > maxInitial && !showAll ? (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.hair}` }}>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            See all {events.length} events
          </button>
        </div>
      ) : null}
    </div>
  );
}
