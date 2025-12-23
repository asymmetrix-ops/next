import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const InsightCard = ({ insight }: { insight: { tag?: string; date?: string; title: string; content: string; id?: number } }) => {
  const [expanded, setExpanded] = useState(false);
 
  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {insight.tag && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium">
                  {insight.tag}
                </Badge>
              )}
              {insight.date && (
                <span className="flex items-center text-xs text-slate-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {insight.date}
                </span>
              )}
            </div>
            {insight.id ? (
              <a href={`/article/${insight.id}`} className="block">
                <h3 className="text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer">
                  {insight.title}
                </h3>
              </a>
            ) : (
              <h3 className="text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                {insight.title}
              </h3>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`relative ${expanded ? '' : 'max-h-24 overflow-hidden'}`}>
          <p className="text-slate-600 leading-relaxed text-sm">
            {insight.content}
          </p>
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-medium"
        >
          {expanded ? (
            <>Show less <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg></>
          ) : (
            <>Read more <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg></>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function InsightsSection({
  insights,
  title = "Insights & Analysis",
}: {
  insights: Array<{ tag?: string; date?: string; title: string; content: string; id?: number }>;
  title?: string;
}) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-amber-50">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        </div>
      </div>
     
      <div className="grid gap-6">
        {insights.map((insight, index) => (
          <InsightCard key={insight.id || index} insight={insight} />
        ))}
      </div>
    </section>
  );
}

