"use client";

import React from "react";
import Link from "next/link";

export interface IndividualCardItem {
  id?: number;
  name: string;
  jobTitles: string[];
  individualId?: number;
  onClick?: () => void;
}

interface IndividualCardsProps {
  individuals: IndividualCardItem[];
  title?: string;
  emptyMessage?: string;
}

const IndividualCards: React.FC<IndividualCardsProps> = ({
  individuals,
  title,
  emptyMessage = "Not available",
}) => {
  if (individuals.length === 0) {
    return (
      <div>
        {title && (
          <h4
            style={{
              fontSize: "14px",
              marginBottom: "12px",
              fontWeight: 600,
              color: "#4a5568",
            }}
          >
            {title}
          </h4>
        )}
        <div style={{ color: "#6b7280", fontSize: "14px" }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h4
          style={{
            fontSize: "14px",
            marginBottom: "12px",
            fontWeight: 600,
            color: "#4a5568",
          }}
        >
          {title}
        </h4>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
        }}
        className="management-grid"
      >
        {individuals.map((person, index) => {
          const handleClick = () => {
            if (person.onClick) {
              person.onClick();
            } else if (person.individualId) {
              window.location.href = `/individual/${person.individualId}`;
            }
          };

          return (
            <div
              key={person.id || person.individualId || index}
              style={{
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                backgroundColor: "#f9fafb",
                transition: "all 0.2s ease",
                cursor: person.individualId || person.onClick ? "pointer" : "default",
              }}
              className="management-card"
              onClick={person.individualId || person.onClick ? handleClick : undefined}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#0075df",
                  marginBottom: "4px",
                }}
              >
                {person.individualId ? (
                  <Link
                    href={`/individual/${person.individualId}`}
                    style={{
                      color: "#0075df",
                      textDecoration: "underline",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {person.name}
                  </Link>
                ) : (
                  person.name
                )}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#4a5568",
                  lineHeight: "1.4",
                }}
              >
                {person.jobTitles.length > 0
                  ? person.jobTitles.join(", ")
                  : "No title"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IndividualCards;

