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
