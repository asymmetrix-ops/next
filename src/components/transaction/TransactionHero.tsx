import React from 'react';

export default function TransactionHero({ 
  transaction,
  reportButton
}: { 
  transaction: { title: string; subtitle?: string };
  reportButton?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
     
      <div className="relative max-w-7xl mx-auto px-6 py-8 lg:py-10">
        {/* Report Button - positioned absolutely in top right */}
        {reportButton && (
          <div className="absolute top-4 right-4">
            {reportButton}
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left content */}
          <div className="flex-1 max-w-3xl">
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-3">
              {transaction.title}
            </h1>
           
            {/* Subtitle */}
            {transaction.subtitle && (
              <p className="text-lg text-white/90 leading-relaxed">
                {transaction.subtitle}
              </p>
            )}
          </div>
         
        </div>
      </div>
    </div>
  );
}

