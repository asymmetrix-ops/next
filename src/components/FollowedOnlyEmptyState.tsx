"use client";

import Link from "next/link";

export type FollowedOnlyEntity =
  | "companies"
  | "investors"
  | "advisors"
  | "individuals"
  | "corporate events";

const labels: Record<FollowedOnlyEntity, string> = {
  companies: "companies",
  investors: "investors",
  advisors: "advisors",
  individuals: "individuals",
  "corporate events": "corporate events",
};

export function FollowedOnlyEmptyState({
  entity,
}: {
  entity: FollowedOnlyEntity;
}) {
  const noun = labels[entity];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "min(58vh, 520px)",
        width: "100%",
        padding: "48px 24px",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          maxWidth: "560px",
          margin: 0,
          fontSize: "15px",
          lineHeight: 1.6,
          color: "#4a5568",
        }}
      >
        {`This section displays Insights and Analysis on ${noun} you follow. You're not following any yet—add ${noun} to `}
        <Link
          href="/my-portfolio"
          style={{ color: "#0075df", fontWeight: 600, textDecoration: "underline" }}
        >
          My Portfolio
        </Link>
        {` to start tracking them.`}
      </p>
    </div>
  );
}
