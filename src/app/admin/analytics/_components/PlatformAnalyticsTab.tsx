"use client";

import { useEffect, useState } from "react";
import { CompaniesEntitiesTab } from "./CompaniesEntitiesTab";
import { CorporateEventsTab } from "./CorporateEventsTab";
import { InsightsAnalysisTab } from "./InsightsAnalysisTab";

type PlatformAnalyticsSubTab =
  | "companies-entities"
  | "insights-analysis"
  | "corporate-events";

const SUB_TABS: Array<{ id: PlatformAnalyticsSubTab; label: string }> = [
  { id: "companies-entities", label: "Companies & Entities" },
  { id: "insights-analysis", label: "I&A" },
  { id: "corporate-events", label: "Corporate Events" },
];

export function PlatformAnalyticsTab() {
  const [activeSubTab, setActiveSubTab] =
    useState<PlatformAnalyticsSubTab>("companies-entities");
  const [mountedTabs, setMountedTabs] = useState<
    Record<PlatformAnalyticsSubTab, boolean>
  >({
    "companies-entities": true,
    "insights-analysis": false,
    "corporate-events": false,
  });

  useEffect(() => {
    setMountedTabs((prev) =>
      prev[activeSubTab] ? prev : { ...prev, [activeSubTab]: true }
    );
  }, [activeSubTab]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        {SUB_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSubTab(id)}
            className={`px-3 py-2 -mb-px border-b-2 ${
              activeSubTab === id
                ? "border-black font-medium"
                : "border-transparent text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mountedTabs["companies-entities"] && (
        <div hidden={activeSubTab !== "companies-entities"}>
          <CompaniesEntitiesTab />
        </div>
      )}
      {mountedTabs["insights-analysis"] && (
        <div hidden={activeSubTab !== "insights-analysis"}>
          <InsightsAnalysisTab />
        </div>
      )}
      {mountedTabs["corporate-events"] && (
        <div hidden={activeSubTab !== "corporate-events"}>
          <CorporateEventsTab />
        </div>
      )}
    </div>
  );
}
