"use client";
/**
 * SubscriptionCard — redesign/SubscriptionCard.jsx converted to TypeScript.
 * ARR / NRR / GDR / Upsell / New logos mini-rows.
 */
import React from "react";
import { LinkPanel, LinkedH, MiniKV, Delta, T } from "./primitives";

export type SubscriptionMetrics = {
  recurringRev?: string;
  arrGrowth?: string;
  nrr?: string;
  gdr?: string;
  upsell?: string;
  newLogos?: string;
  churn?: string;
  crossSell?: string;
  priceIncrease?: string;
  revExpansion?: string;
};

export function SubscriptionCard({
  recurringRev,
  arrGrowth,
  nrr,
  gdr,
  upsell,
  newLogos,
  churn,
  crossSell,
  priceIncrease,
  revExpansion,
  fillGridCell = false,
}: SubscriptionMetrics & { fillGridCell?: boolean }) {
  const rows: { k: string; v: React.ReactNode; mono?: boolean }[] = [
    {
      k: "Recurring rev",
      v: recurringRev || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "ARR growth",
      v: arrGrowth ? (
        <Delta value={arrGrowth} />
      ) : (
        <span style={{ color: T.faint }}>—</span>
      ),
    },
    {
      k: "NRR",
      v: nrr || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "GDR",
      v: gdr || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "Upsell",
      v: upsell || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "New logos",
      v: newLogos || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "Churn",
      v: churn || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "Cross-sell",
      v: crossSell || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "Price increase",
      v: priceIncrease || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
    {
      k: "Rev expansion",
      v: revExpansion || <span style={{ color: T.faint }}>—</span>,
      mono: true,
    },
  ];

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Subscription metrics</LinkedH>
      <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
        {rows.map((row, i) => (
          <MiniKV
            key={row.k}
            k={row.k}
            v={row.v}
            mono={row.mono}
            last={i === rows.length - 1}
          />
        ))}
      </div>
    </LinkPanel>
  );
}
