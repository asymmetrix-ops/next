import React from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdvisorsSection({ advisors, createClickableElement }: { 
  advisors: Array<{
    id: number;
    name: string;
    logo?: string;
    role?: string;
    advising?: string | React.ReactNode;
    individuals?: string | React.ReactNode;
    announcementUrl?: string;
    href?: string;
  }>;
  createClickableElement?: (href: string, text: string, className?: string) => React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-100">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900">Advisors</h2>
      </div>
     
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Logo</TableHead>
              <TableHead className="font-semibold text-slate-700">Name</TableHead>
              <TableHead className="font-semibold text-slate-700">Role</TableHead>
              <TableHead className="font-semibold text-slate-700">Company Advised</TableHead>
              <TableHead className="font-semibold text-slate-700">Individuals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!advisors || advisors.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  No advisor information available for this transaction
                </TableCell>
              </TableRow>
            ) : (
              advisors.map((advisor) => (
                <TableRow key={advisor.id} className="hover:bg-slate-50">
                  <TableCell>
                    {advisor.logo ? (
                      <img
                        src={advisor.logo}
                        alt={advisor.name}
                        className="w-10 h-10 rounded object-contain bg-slate-50 p-1"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {advisor.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {advisor.href && createClickableElement ? (
                      createClickableElement(advisor.href, advisor.name, "text-blue-600 hover:underline")
                    ) : (
                      <span>{advisor.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {advisor.role || 'Not available'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {advisor.advising || 'Not available'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {advisor.individuals || 'Not available'}
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

