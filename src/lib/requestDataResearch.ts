export const DATA_REQUEST_TYPES = [
  "Company",
  "Sector",
  "Investor",
  "Advisor",
  "Individual",
  "Corporate Event",
  "Financial Metrics Estimates",
] as const;

export const RESEARCH_REQUEST_TYPES = [
  "Company Analysis",
  "Deal Perspective",
  "Sector Analysis",
] as const;

export type DataRequestType = (typeof DATA_REQUEST_TYPES)[number];
export type ResearchRequestType = (typeof RESEARCH_REQUEST_TYPES)[number];
export type RequestTab = "data" | "research";
export type RequestCategory = "Data" | "Analysis";

export function tabToCategory(tab: RequestTab): RequestCategory {
  return tab === "research" ? "Analysis" : "Data";
}

/** Context key that maps a call-site to default tab + pre-filled types */
export type RequestContext =
  | "dashboard"
  | "company"
  | "sector"
  | "investor"
  | "advisor"
  | "individual"
  | "corporate-event"
  | "insights-analysis"
  | "insights-analysis-item";

export interface ContextDefaults {
  defaultTab: RequestTab;
  defaultDataType: DataRequestType | "";
  defaultResearchType: ResearchRequestType | "";
}

export function getContextDefaults(context: RequestContext): ContextDefaults {
  switch (context) {
    case "company":
      return { defaultTab: "data", defaultDataType: "Company", defaultResearchType: "Company Analysis" };
    case "sector":
      return { defaultTab: "data", defaultDataType: "Sector", defaultResearchType: "Sector Analysis" };
    case "investor":
      return { defaultTab: "data", defaultDataType: "Investor", defaultResearchType: "" };
    case "advisor":
      return { defaultTab: "data", defaultDataType: "Advisor", defaultResearchType: "" };
    case "individual":
      return { defaultTab: "data", defaultDataType: "Individual", defaultResearchType: "" };
    case "corporate-event":
      return { defaultTab: "data", defaultDataType: "Corporate Event", defaultResearchType: "" };
    case "insights-analysis":
    case "insights-analysis-item":
      return { defaultTab: "research", defaultDataType: "", defaultResearchType: "" };
    default:
      return { defaultTab: "data", defaultDataType: "", defaultResearchType: "" };
  }
}

// Legacy – kept for any remaining imports, will be removed once call sites migrate
export const REQUEST_DATA_RESEARCH_TYPES = [
  "Company Profile",
  "Research Report",
  "Advisor Profile",
  "Investor Profile",
  "Individual Profile",
  "Corporate Event",
] as const;

export type RequestDataResearchType =
  (typeof REQUEST_DATA_RESEARCH_TYPES)[number];
