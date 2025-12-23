import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RelatedTransactionRow = {
  id: number;
  title: string;
  date?: string;
  dealType?: string;
  target?: string | React.ReactNode;
  investors?: string;
  advisors?: string;
};

export default function RelatedTransactionsSection({
  transactions,
}: {
  transactions: RelatedTransactionRow[];
}) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Recent Sector Transactions
        </h2>
      </div>

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700 min-w-[240px]">
                Event
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[160px]">
                Date
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[140px]">
                Deal Type
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[220px]">
                Target
              </TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[220px]">
                Investors
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!transactions || transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  No related transactions available
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50">
                  <TableCell>
                    <a
                      href={`/corporate-event/${t.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {t.title}
                    </a>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {t.date || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {t.dealType || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {t.target || "Not available"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {t.investors || "Not available"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}


