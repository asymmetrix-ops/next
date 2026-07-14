"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import {
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
} from "@/components/redesign/primitives";

export type CorporateEventAdvisorRow = {
  id: number;
  name: string;
  logo?: string;
  role: string;
  advisedName?: string;
  advisedHref?: string;
  href?: string;
  individuals: Array<{ id: number; name: string }>;
};

type Props = {
  advisors: CorporateEventAdvisorRow[];
};

const ROW_GRID = "minmax(0, 28%) minmax(0, 16%) minmax(0, 24%) minmax(0, 32%)";
const COL_GAP = 2;
const ROW_PAD = "6px 10px";

function AdvisorLogo({ logo, name }: { logo?: string; name: string }) {
  const src = resolveCompanyLogoSrc(logo);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
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

export function CorporateEventAdvisorsPanel({ advisors }: Props) {
  const headerRight = useMemo(() => {
    if (advisors.length === 0) return "";
    return `${advisors.length} advisor${advisors.length === 1 ? "" : "s"}`;
  }, [advisors.length]);

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
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>Advisors</div>
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
            {(["Advisor", "Role", "Advised", "Individuals"] as const).map((h) => (
              <div key={h} style={{ ...tableColHeaderStyle, textAlign: "left", fontSize: 10 }}>
                {h}
              </div>
            ))}
          </div>

          {advisors.length > 0 ? (
            advisors.map((advisor, index) => {
              const last = index === advisors.length - 1;
              return (
                <div
                  key={advisor.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: ROW_PAD,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                    <AdvisorLogo logo={advisor.logo} name={advisor.name} />
                    {advisor.href ? (
                      <Link
                        href={advisor.href}
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
                        {advisor.name}
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
                        {advisor.name}
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
                    }}
                  >
                    {advisor.role || "-"}
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {advisor.advisedHref && advisor.advisedName ? (
                      <Link
                        href={advisor.advisedHref}
                        prefetch={false}
                        style={{ color: T.azure, textDecoration: "underline", fontSize: 12 }}
                      >
                        {advisor.advisedName}
                      </Link>
                    ) : (
                      <span style={{ color: T.body, fontSize: 12 }}>{advisor.advisedName || "-"}</span>
                    )}
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, minWidth: 0, lineHeight: 1.35 }}>
                    {advisor.individuals.length > 0
                      ? advisor.individuals.map((ind, i) => (
                          <span key={ind.id}>
                            <Link
                              href={`/individual/${ind.id}`}
                              prefetch={false}
                              style={{ color: T.azure, textDecoration: "underline" }}
                            >
                              {ind.name}
                            </Link>
                            {i < advisor.individuals.length - 1 ? ", " : ""}
                          </span>
                        ))
                      : "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "20px 16px", color: T.muted, fontSize: "12.5px", textAlign: "center" }}>
              No advisor information available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
