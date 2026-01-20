import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PreviousCorporateEventRow = {
  id: number;
  title: string;
  announcementDate?: string;
  closedDate?: string;
  dealType?: string;
  dealStatus?: string;
  targetRole?: string;
};

export default function PreviousCorporateEventsSection({
  events,
}: {
  events: PreviousCorporateEventRow[];
}) {
  const [displayCount, setDisplayCount] = useState(5);
  const displayed = events.slice(0, displayCount);
  const hasMore = events.length > displayCount;

  return (
    <section className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-100">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900">
          Previous Corporate Events
        </h2>
      </div>

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700 min-w-[260px]">
                Event
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[160px]">
                Announced
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[160px]">
                Closed
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[140px]">
                Deal Type
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[140px]">
                Deal Status
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[160px]">
                Target Role
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  No previous corporate events available
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((e) => (
                <TableRow key={e.id} className="hover:bg-slate-50">
                  <TableCell>
                    <a
                      href={`/corporate-event/${e.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {e.title}
                    </a>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {e.announcementDate || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {e.closedDate || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {e.dealType || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {e.dealStatus || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {e.targetRole || "Not available"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setDisplayCount((prev) => prev + 5)}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Load More
          </Button>
        </div>
      )}
    </section>
  );
}


