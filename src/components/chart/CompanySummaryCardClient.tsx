"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ReadMoreText from "@/components/ui/read-more-text";
import Link from "next/link";

interface SummaryProfile {
  longBusinessSummary?: string;
  sector?: string;
  industryDisp?: string;
  country?: string;
  fullTimeEmployees?: number;
  website?: string;
}

export default function CompanySummaryCardClient({
  ticker,
}: {
  ticker: string;
}) {
  const [summaryProfile, setSummaryProfile] = useState<SummaryProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/stock/summary?ticker=${ticker}&modules=summaryProfile`
        );
        if (!response.ok) throw new Error("Failed to fetch summary data");
        const data = await response.json();

        setSummaryProfile(data.summaryProfile || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Loading company summary...
      </div>
    );
  }

  if (error || !summaryProfile) {
    return null;
  }

  const {
    longBusinessSummary,
    sector,
    industryDisp,
    country,
    fullTimeEmployees,
    website,
  } = summaryProfile;

  return (
    <Card className="group relative min-h-max overflow-hidden">
      <div className="absolute z-0 h-full w-full bg-gradient-to-t from-neutral-50 via-neutral-200 to-neutral-50 bg-size-200 bg-pos-0 blur-2xl transition-all duration-500 group-hover:bg-pos-100 dark:from-black dark:via-blue-950 dark:to-black" />

      <CardContent className="z-50 flex h-full w-full flex-col items-start justify-center gap-6 py-10 text-sm lg:flex-row">
        <div className="z-50 max-w-2xl text-pretty font-medium">
          <ReadMoreText text={longBusinessSummary ?? ""} truncateLength={500} />
        </div>
        {sector && industryDisp && country && fullTimeEmployees && website && (
          <div className="z-50 min-w-fit font-medium text-muted-foreground">
            <div>
              Sector: <span className="text-foreground ">{sector}</span>
            </div>
            <div>
              Industry: <span className="text-foreground ">{industryDisp}</span>
            </div>
            <div>
              Country: <span className="text-foreground ">{country}</span>
            </div>
            <div>
              Employees:{" "}
              <span className="text-foreground ">
                {fullTimeEmployees?.toLocaleString("en-US")}
              </span>
            </div>
            <div>
              Website:{" "}
              <span className="text-foreground ">
                {website && (
                  <Link
                    href={website}
                    className="text-blue-600 hover:underline dark:text-blue-500"
                  >
                    {website}
                  </Link>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
