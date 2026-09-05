import React, { type CSSProperties, type ReactNode } from "react";

export const SEARCH_DASHBOARD_HORIZONTAL_PAD = "28px";
export const SEARCH_DASHBOARD_TOP_PAD = "20px";

export const SEARCH_DASHBOARD_SHELL: CSSProperties = {
  background: "#f7f8fc",
  borderBottom: "1px solid rgba(0, 11, 41, 0.08)",
};

export const SEARCH_DASHBOARD_INNER: CSSProperties = {
  width: "100%",
  padding: `${SEARCH_DASHBOARD_TOP_PAD} ${SEARCH_DASHBOARD_HORIZONTAL_PAD} 0`,
};

export const SEARCH_DASHBOARD_HEADER_ROW: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

export const SEARCH_DASHBOARD_EYEBROW: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 10px",
  borderRadius: 999,
  background: "hsl(228, 30%, 94%)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "hsl(228, 85%, 45%)",
  marginBottom: 6,
};

export const SEARCH_DASHBOARD_TITLE: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.026em",
  color: "#000b29",
  display: "flex",
  alignItems: "baseline",
  gap: 11,
  lineHeight: 1.2,
};

export const SEARCH_DASHBOARD_MATCH_COUNT: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#5a6272",
  letterSpacing: 0,
};

export const SEARCH_DASHBOARD_ACTIONS: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  paddingTop: 6,
};

export const SEARCH_DASHBOARD_TABS_ROW: CSSProperties = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
};

export const SEARCH_DASHBOARD_FILTER_SHELL: CSSProperties = {
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
};

export const SEARCH_DASHBOARD_FILTER_INNER: CSSProperties = {
  width: "100%",
  padding: `10px ${SEARCH_DASHBOARD_HORIZONTAL_PAD} 12px`,
};

export function getSearchTabButtonStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 34,
    padding: "0 14px",
    background: active ? "#000b29" : "#fff",
    color: active ? "#fff" : "#313a54",
    border: "1px solid",
    borderColor: active ? "#000b29" : "rgba(0, 11, 41, 0.08)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease, border-color 0.15s ease",
    whiteSpace: "nowrap",
  };
}

export type SearchListTabItem = {
  id: string;
  label: string;
  count: number;
  dot: string;
};

type SearchListTabsProps = {
  tabs: SearchListTabItem[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  renderTabWrapper?: (tab: SearchListTabItem, button: ReactNode) => ReactNode;
};

export function SearchListTabs({
  tabs,
  activeTabId,
  onTabClick,
  renderTabWrapper,
}: SearchListTabsProps) {
  return (
    <div style={SEARCH_DASHBOARD_TABS_ROW}>
      {tabs.map((tab) => {
        const active = activeTabId === tab.id;
        const button = (
          <button
            type="button"
            onClick={() => onTabClick(tab.id)}
            style={getSearchTabButtonStyle(active)}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: active ? "rgba(255,255,255,0.7)" : tab.dot,
                flexShrink: 0,
              }}
            />
            {tab.label}
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              {tab.count.toLocaleString()}
            </span>
          </button>
        );

        if (renderTabWrapper) {
          return (
            <React.Fragment key={tab.id}>
              {renderTabWrapper(tab, button)}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={tab.id}>{button}</React.Fragment>
        );
      })}
    </div>
  );
}
