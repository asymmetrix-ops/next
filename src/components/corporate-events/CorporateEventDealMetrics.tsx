"use client";

import React from "react";

export interface CorporateEventDealMetricsProps {
  dealType?: string | null;
  /** Optional funding stage label (e.g. "Series A") to display next to deal type. */
  fundingStage?: string | null;
  isPartnership?: boolean;
  amountLabel?: string;
  evLabel?: string;
  /**
   * When backend provides a ready-made display string for investment (e.g. "EUR 90m"),
   * prefer this over numeric fields.
   */
  amountDisplay?: string | null;
  /**
   * Amount in millions (numeric or string). No trailing "m" should be added here;
   * the "(m)" indicator lives in the label.
   */
  amountMillions?: number | string | null;
  amountCurrency?: string | null;
  /**
   * When backend provides a ready-made display string for EV.
   */
  evDisplay?: string | null;
  /**
   * EV in millions (numeric or string). No trailing "m" should be added here;
   * the "(m)" indicator lives in the label.
   */
  evMillions?: number | string | null;
  evCurrency?: string | null;
  /**
   * Optional textual fallback for EV when numeric amount is missing
   * (e.g. an EV band string).
   */
  evBandFallback?: string | null;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const formatMillions = (
  amount: number | string | null | undefined,
  currency: string | null | undefined
): string => {
  if (amount == null || !isNonEmptyString(currency)) return "Not available";
  const n =
    typeof amount === "number"
      ? amount
      : Number(String(amount).replace(/,/g, "").trim());
  if (Number.isNaN(n)) return "Not available";
  // Values are already in millions; "(m)" is indicated in the field label.
  return `${currency}${n.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })}`;
};

export const CorporateEventDealMetrics: React.FC<
  CorporateEventDealMetricsProps
> = ({
  dealType,
  fundingStage,
  isPartnership,
  amountLabel = "Amount (m)",
  evLabel = "EV (m)",
  amountDisplay,
  amountMillions,
  amountCurrency,
  evDisplay,
  evMillions,
  evCurrency,
  evBandFallback,
}) => {
  const hasEvDisplay = isNonEmptyString(evDisplay);
  const hasEvNumeric =
    evMillions != null && isNonEmptyString(evCurrency) && // ensure both present
    !Number.isNaN(
      typeof evMillions === "number"
        ? evMillions
        : Number(String(evMillions).replace(/,/g, "").trim())
    );
  const hasEvBand = isNonEmptyString(evBandFallback);
  const shouldShowEvRow = hasEvDisplay || hasEvNumeric || hasEvBand;

  return (
    <>
      <div className="muted-row">
        <strong>Deal Type:</strong>{" "}
        {isNonEmptyString(dealType) || isNonEmptyString(fundingStage) ? (
          <>
            {isNonEmptyString(dealType) && (
              <span className="pill pill-blue">{dealType}</span>
            )}
            {isNonEmptyString(fundingStage) && (
              <span className="pill pill-green" style={{ marginLeft: 4 }}>
                {fundingStage}
              </span>
            )}
          </>
        ) : (
          <span>Not Available</span>
        )}
      </div>

      {/* For partnerships we intentionally hide amount / EV in list views */}
      {!isPartnership && (
        <>
          <div className="muted-row">
            <strong>{amountLabel}:</strong>{" "}
            {isNonEmptyString(amountDisplay)
              ? amountDisplay
              : formatMillions(amountMillions, amountCurrency)}
          </div>
          {shouldShowEvRow && (
            <div className="muted-row">
              <strong>{evLabel}:</strong>{" "}
              {isNonEmptyString(evDisplay)
                ? evDisplay
                : hasEvNumeric
                ? formatMillions(evMillions, evCurrency)
                : isNonEmptyString(evBandFallback)
                ? evBandFallback
                : null}
            </div>
          )}
        </>
      )}
    </>
  );
};


