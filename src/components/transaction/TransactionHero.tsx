import React from 'react';

export default function TransactionHero({ 
  transaction,
  reportButton
}: { 
  transaction: { title: string; subtitle?: string };
  reportButton?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
     
      <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {/* Report Button - positioned absolutely in top right */}
        {reportButton && (
          <div className="absolute top-6 right-6">
            {reportButton}
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Left content */}
          <div className="flex-1 max-w-3xl">
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              {transaction.title}
            </h1>
           
            {/* Subtitle */}
            {transaction.subtitle && (
              <p className="text-lg text-slate-400 leading-relaxed">
                {transaction.subtitle}
              </p>
            )}
          </div>
         
        </div>
      </div>
    </div>
  );
}

