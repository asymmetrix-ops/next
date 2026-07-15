"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
} from "@/components/redesign/primitives";

export type CorporateEventCounterpartyRow = {
  id: number;
  name: string;
  role: string;
  logo?: string;
  href?: string;
  individuals: Array<{ id: number; name: string }>;
};

type Props = {
  counterparties: CorporateEventCounterpartyRow[];
};

const ROW_GRID = "minmax(0, 36%) minmax(0, 34%) minmax(0, 30%)";
const COL_GAP = 12;
const TYPE_COL_PAD_LEFT = 8;
const INDIVIDUALS_COL_PAD_LEFT = 16;
const ROW_PAD = "6px 10px";

function PartyLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={`${name} logo`}
        width={18}
        height={18}
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: `1px solid ${T.divider}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        backgroundColor: T.inset,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 600,
        color: T.muted,
        border: `1px solid ${T.divider}`,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function CorporateEventCounterpartiesPanel({ counterparties }: Props) {
  const headerRight = useMemo(() => {
    if (counterparties.length === 0) return "";
    return `${counterparties.length} part${counterparties.length === 1 ? "y" : "ies"}`;
  }, [counterparties.length]);

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
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>Counterparties</div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <div style={{ width: "100%", ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: ROW_GRID,
              gap: COL_GAP,
              padding: ROW_PAD,
            }}
          >
            {(["Company", "Type", "Individuals"] as const).map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: "left",
                  fontSize: 10,
                  paddingLeft:
                    colIndex === 1
                      ? TYPE_COL_PAD_LEFT
                      : colIndex === 2
                        ? INDIVIDUALS_COL_PAD_LEFT
                        : 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {counterparties.length > 0 ? (
            counterparties.map((cp, index) => {
              const last = index === counterparties.length - 1;
              return (
                <div
                  key={cp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: ROW_PAD,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      overflow: "hidden",
                      paddingRight: 4,
                    }}
                  >
                    <PartyLogo logo={cp.logo} name={cp.name} />
                    {cp.href ? (
                      <Link
                        href={cp.href}
                        prefetch={false}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          fontSize: 12,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cp.name}
                      </Link>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cp.name}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      color: T.body,
                      fontSize: 12,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingLeft: TYPE_COL_PAD_LEFT,
                      paddingRight: 4,
                    }}
                  >
                    {cp.role || "-"}
                  </div>
                  <div
                    style={{
                      color: T.muted,
                      fontSize: 12,
                      minWidth: 0,
                      lineHeight: 1.35,
                      paddingLeft: INDIVIDUALS_COL_PAD_LEFT,
                    }}
                  >
                    {cp.individuals.length > 0
                      ? cp.individuals.map((ind, i) => (
                          <span key={ind.id}>
                            <Link
                              href={`/individual/${ind.id}`}
                              prefetch={false}
                              style={{ color: T.azure, textDecoration: "underline" }}
                            >
                              {ind.name}
                            </Link>
                            {i < cp.individuals.length - 1 ? ", " : ""}
                          </span>
                        ))
                      : "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "20px 16px", color: T.muted, fontSize: "12.5px", textAlign: "center" }}>
              No counterparty information available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
