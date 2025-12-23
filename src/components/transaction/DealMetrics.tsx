import React from 'react';
import { Card } from "@/components/ui/card";

const MetricCard = ({ label, value, subValue }: { label: string; value: string | React.ReactNode; subValue?: string }) => (
  <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value || 'Not available'}</p>
      {subValue && <p className="text-base text-slate-500 mt-1">{subValue}</p>}
    </div>
  </Card>
);

export default function DealMetrics({ metrics }: { 
  metrics: {
    sector?: string;
    subSector?: string;
    dateAnnounced?: string;
    dateClosed?: string;
    dealType?: string;
    dealStage?: string;
    investmentAmount?: string;
    currency?: string;
    enterpriseValue?: string;
  }
}) {
  return (
    <div className="bg-slate-50/50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Sector fields */}
        <div className="mb-8 border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Sector</p>
              <p className="text-xl font-semibold text-slate-900">{metrics.sector || 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Sub-Sector</p>
              <p className="text-xl font-semibold text-slate-900">{metrics.subSector || 'Not available'}</p>
            </div>
          </div>
        </div>

        {/* Metric cards in vertical pairs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <MetricCard
            label="Date Announced"
            value={metrics.dateAnnounced}
          />
          <MetricCard
            label="Deal Type"
            value={metrics.dealType}
          />
          <MetricCard
            label="Investment Amount"
            value={metrics.investmentAmount}
            subValue={metrics.currency}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <MetricCard
            label="Date Closed"
            value={metrics.dateClosed}
          />
          <MetricCard
            label="Deal Stage"
            value={metrics.dealStage}
          />
          <MetricCard
            label="Enterprise Value"
            value={metrics.enterpriseValue}
          />
        </div>
      </div>
    </div>
  );
}

