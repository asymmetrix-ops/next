import React from 'react';
import { Card } from "@/components/ui/card";

const MetricCard = ({ label, value, subValue }: { label: string; value: string | React.ReactNode; subValue?: string }) => (
  <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value || 'Not available'}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  </Card>
);

export default function DealMetrics({ metrics }: { 
  metrics: {
    sectors?: Array<{ name: string; id?: number }>;
    subSectors?: Array<{ name: string; id?: number }>;
    dateAnnounced?: string;
    dateClosed?: string;
    dealType?: string;
    dealStage?: string;
    investmentAmount?: string;
    currency?: string;
    enterpriseValue?: string;
    enterpriseValueCurrency?: string;
  }
}) {
  const renderSectors = (sectors?: Array<{ name: string; id?: number }>) => {
    if (!sectors || sectors.length === 0) {
      return <span className="text-xl font-semibold text-slate-900">Not available</span>;
    }
    return (
      <div className="flex flex-wrap items-center">
        {sectors.map((sector, idx) => (
          <span key={sector.id || idx}>
            {sector.id ? (
              <a 
                href={`/sector/${sector.id}`} 
                className="text-xl font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {sector.name}
              </a>
            ) : (
              <span className="text-xl font-semibold text-slate-900">{sector.name}</span>
            )}
            {idx < sectors.length - 1 && <span className="text-slate-400 mr-1">,</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderSubSectors = (subSectors?: Array<{ name: string; id?: number }>) => {
    if (!subSectors || subSectors.length === 0) {
      return <span className="text-xl font-semibold text-slate-900">Not available</span>;
    }
    return (
      <div className="flex flex-wrap items-center">
        {subSectors.map((subSector, idx) => (
          <span key={subSector.id || idx}>
            {subSector.id ? (
              <a 
                href={`/sub-sector/${subSector.id}`} 
                className="text-xl font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {subSector.name}
              </a>
            ) : (
              <span className="text-xl font-semibold text-slate-900">{subSector.name}</span>
            )}
            {idx < subSectors.length - 1 && <span className="text-slate-400 mr-1">,</span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-50/50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Sector fields */}
        <div className="mb-8 border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Sector(s)</p>
              {renderSectors(metrics.sectors)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Sub-Sector(s)</p>
              {renderSubSectors(metrics.subSectors)}
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
            subValue={metrics.enterpriseValueCurrency}
          />
        </div>
      </div>
    </div>
  );
}

