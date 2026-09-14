"use client";

import React from "react";
import { useCapitalRadar } from "@/hooks/useCapitalRadar";
import { T, CARD_TITLE_STYLE } from "@/components/redesign/primitives";
import { CapitalRadarCard } from "./CapitalRadarCard";

function CapitalRadarSkeletonLoading() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      style={{ marginTop: 20 }}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${T.divider}`,
            borderRadius: T.rLg,
            background: T.panel,
            minHeight: 160,
            padding: 14,
          }}
        >
          <div
            style={{
              width: "40%",
              height: 14,
              borderRadius: 4,
              background: T.inset,
              marginBottom: 14,
            }}
          />
          {[0, 1, 2].map((r) => (
            <div
              key={r}
              style={{
                width: "100%",
                height: 12,
                borderRadius: 4,
                background: T.inset,
                marginBottom: 10,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CapitalRadarSection({
  companyId,
}: {
  companyId: number | string | null | undefined;
}) {
  const { data, isLoading, error } = useCapitalRadar(companyId);

  if (isLoading) return <CapitalRadarSkeletonLoading />;
  if (error) return null;
  if (!data) return null;

  const hasAnyRows =
    (data.potential_investors?.rows?.length ?? 0) > 0 ||
    (data.strategic_buyers?.rows?.length ?? 0) > 0;
  if (!hasAnyRows) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h2
        style={{
          ...CARD_TITLE_STYLE,
          fontSize: 15,
          marginBottom: 10,
        }}
      >
        Capital Radar
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.potential_investors && (
          <CapitalRadarCard
            title="Potential investors"
            card={data.potential_investors}
            showTimingColumn
          />
        )}
        {data.strategic_buyers && (
          <CapitalRadarCard
            title="Strategic buyers"
            card={data.strategic_buyers}
            showTimingColumn={false}
          />
        )}
      </div>
    </section>
  );
}
