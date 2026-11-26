import React, { type CSSProperties, type ReactNode } from "react";

export const SEARCH_DASHBOARD_HORIZONTAL_PAD = "28px";
export const SEARCH_DASHBOARD_TOP_PAD = "20px";

export const SEARCH_DASHBOARD_SHELL: CSSProperties = {
  background: "var(--t-paper)",
  borderBottom: "1px solid var(--t-divider)",
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
  marginBottom: 16,
};

export const SEARCH_DASHBOARD_EYEBROW: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 10px",
  borderRadius: 999,
  background: "var(--t-azure-soft)",
  border: "1px solid var(--c-line-e2e8fd)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--t-azure)",
  marginBottom: 6,
};

export const SEARCH_DASHBOARD_TITLE: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.026em",
  color: "var(--t-ink)",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  display: "flex",
  alignItems: "baseline",
  gap: 11,
  lineHeight: 1.2,
};

export const SEARCH_DASHBOARD_MATCH_COUNT: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--t-muted)",
  letterSpacing: 0,
};

export const SEARCH_DASHBOARD_ACTIONS: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  paddingTop: 6,
  flexWrap: "wrap",
};

export const SEARCH_DASHBOARD_TABS_ROW: CSSProperties = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
  marginBottom: 4,
};

export const SEARCH_DASHBOARD_FILTER_SHELL: CSSProperties = {
  background: "var(--t-panel)",
  borderTop: "1px solid var(--t-divider)",
  borderBottom: "1px solid var(--t-divider)",
};

export const SEARCH_DASHBOARD_FILTER_INNER: CSSProperties = {
  width: "100%",
  padding: `8px ${SEARCH_DASHBOARD_HORIZONTAL_PAD} 8px`,
};

type TabTone = { bg: string; border: string; fg: string };

// Plain hex, or the light hex held in a one-off theme colour name (var(--c-fg-1e7a50))
function hexToRgb(hex: string): [number, number, number] | null {
  const m =
    /^#?([0-9a-f]{6})$/i.exec(hex.trim()) ?? /^var\(--c-[a-z]+-([0-9a-f]{6})\)$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [number, number, number];
}

function toHex(c: [number, number, number]) {
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Dark card colour (app/theme.css --t-panel)
const DARK_PANEL: [number, number, number] = [23, 29, 41];

/**
 * Active tab colours taken from the tab's own tag colour (its dot), like the
 * News type chips: light tint as the background, a darker shade of the same
 * hue for the text, darkened until it meets WCAG AA (4.5:1) on the tint.
 * Dark theme: the colour over the dark card, with a lighter shade for the text.
 */
export function getSearchTabTone(dot: string): TabTone {
  const base = hexToRgb(dot) ?? [61, 91, 243];
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const bg = mix(base, white, 0.88);
  let fg = mix(base, black, 0.25);
  for (let t = 0.25; t < 0.9 && contrast(fg, bg) < 4.5; t += 0.05) {
    fg = mix(base, black, t);
  }
  const darkBg = mix(base, DARK_PANEL, 0.8);
  let darkFg = mix(base, white, 0.35);
  for (let t = 0.35; t < 0.95 && contrast(darkFg, darkBg) < 4.5; t += 0.05) {
    darkFg = mix(base, white, t);
  }
  const both = (light: [number, number, number], dark: [number, number, number]) =>
    `light-dark(${toHex(light)}, ${toHex(dark)})`;
  return {
    bg: both(bg, darkBg),
    border: both(mix(base, white, 0.68), mix(base, DARK_PANEL, 0.6)),
    fg: both(fg, darkFg),
  };
}

export function getSearchTabButtonStyle(
  active: boolean,
  dot?: string
): CSSProperties {
  const tone = active && dot ? getSearchTabTone(dot) : null;
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 34,
    padding: "0 14px",
    background: tone ? tone.bg : "var(--t-panel)",
    color: tone ? tone.fg : "var(--ax-gray-700)",
    border: "1px solid",
    borderColor: tone ? tone.border : "var(--t-divider)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    fontFamily:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            style={getSearchTabButtonStyle(active, tab.dot)}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: tab.dot,
                flexShrink: 0,
              }}
            />
            {tab.label}
            <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.75 }}>
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
