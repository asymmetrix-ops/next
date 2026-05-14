"use client";

import React from "react";
import {
  CorporateEventsTable,
  type CorporateEvent,
  type Sector,
} from "./CorporateEventsTable";

type CorporateEventsSectionProps = {
  title?: string;
  /** When false, omit the section heading (e.g. use an outer card header) */
  showTitle?: boolean;
  events: CorporateEvent[];
  loading?: boolean;
  onEventClick?: (eventId: number, description?: string) => void;
  onAdvisorClick?: (advisorId?: number, advisorName?: string) => void;
  showSectors?: boolean;
  primarySectors?: Sector[];
  secondarySectors?: Sector[];
  maxInitialEvents?: number;
  truncateDescriptionLength?: number;
  /** When true, hides the entire section if there are no events and not loading */
  hideWhenEmpty?: boolean;
  /** When true, applies the same divider-top layout used on the company page */
  dividerTop?: boolean;
  containerStyle?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
  tableVariant?: "legacy" | "v3";
};

export const CorporateEventsSection: React.FC<CorporateEventsSectionProps> = ({
  title = "Corporate Events",
  showTitle = true,
  events,
  loading = false,
  onEventClick,
  onAdvisorClick,
  showSectors = false,
  primarySectors = [],
  secondarySectors = [],
  maxInitialEvents = 3,
  truncateDescriptionLength = 180,
  hideWhenEmpty = false,
  dividerTop = false,
  containerStyle,
  titleStyle,
  tableVariant = "legacy",
}) => {
  if (hideWhenEmpty && !loading && (!events || events.length === 0)) return null;

  return (
    <div
      style={{
        ...(dividerTop
          ? {
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
            }
          : null),
        ...containerStyle,
      }}
    >
      {showTitle ? (
        <h3
          style={{
            fontSize: "17px",
            marginBottom: "12px",
            marginTop: 0,
            ...titleStyle,
          }}
        >
          {title}
        </h3>
      ) : null}

      <CorporateEventsTable
        events={events}
        loading={loading}
        onEventClick={onEventClick}
        onAdvisorClick={onAdvisorClick}
        showSectors={showSectors}
        primarySectors={primarySectors}
        secondarySectors={secondarySectors}
        maxInitialEvents={maxInitialEvents}
        truncateDescriptionLength={truncateDescriptionLength}
        variant={tableVariant}
      />
    </div>
  );
};


