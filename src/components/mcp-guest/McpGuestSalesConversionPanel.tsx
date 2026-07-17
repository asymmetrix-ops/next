"use client";

import McpGuestCalendlyEmbed from "@/components/mcp-guest/McpGuestCalendlyEmbed";

type McpGuestSalesConversionPanelProps = {
  compact?: boolean;
};

export function McpGuestSalesConversionPanel({
  compact = false,
}: McpGuestSalesConversionPanelProps) {
  return (
    <div className={compact ? "text-left" : "text-center"}>
      <h2
        id="mcp-sales-conversion-title"
        className={`font-bold text-gray-900 ${
          compact ? "mb-2 text-xl" : "mb-3 text-3xl"
        }`}
      >
        Interested in getting more info?
      </h2>
      <p
        className={`text-gray-600 leading-relaxed ${
          compact ? "mb-4 text-sm" : "mb-8"
        }`}
      >
        Book a slot with our Sales team to learn about full Asymmetrix access
        — company profiles, exports, sectors, investors, and more.
      </p>
      <McpGuestCalendlyEmbed height={compact ? 620 : 700} />
    </div>
  );
}

type McpGuestSalesConversionModalProps = {
  open: boolean;
  onClose: () => void;
};

export function McpGuestSalesConversionModal({
  open,
  onClose,
}: McpGuestSalesConversionModalProps) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 10000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-sales-conversion-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 920,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          backgroundColor: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)",
          padding: "24px",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            float: "right",
            width: 28,
            height: 28,
            border: "1px solid #e2e8f0",
            borderRadius: "50%",
            backgroundColor: "#f8fafc",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ clear: "both" }}>
          <McpGuestSalesConversionPanel compact />
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              color: "#334155",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Back to MCP companies
          </button>
        </div>
      </div>
    </div>
  );
}
