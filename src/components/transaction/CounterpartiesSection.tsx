import React from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CounterpartiesSection({ counterparties, createClickableElement }: { 
  counterparties: Array<{
    id: number;
    name: string;
    role: string;
    logo?: string;
    individuals?: string | React.ReactNode;
    announcementUrl?: string;
    href?: string;
  }>;
  createClickableElement?: (href: string, text: string, className?: string) => React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Counterparties</h2>
      </div>
     
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Logo</TableHead>
              <TableHead className="font-semibold text-slate-700">Company</TableHead>
              <TableHead className="font-semibold text-slate-700">Counterparty type</TableHead>
              <TableHead className="font-semibold text-slate-700">Announcement URL</TableHead>
              <TableHead className="font-semibold text-slate-700">Individuals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!counterparties || counterparties.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  No counterparty information available
                </TableCell>
              </TableRow>
            ) : (
              counterparties.map((company) => (
                <TableRow key={company.id} className="hover:bg-slate-50">
                  <TableCell>
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-10 h-10 rounded object-contain bg-slate-50 p-1"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-400">
                          {company.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {company.href && createClickableElement ? (
                      createClickableElement(company.href, company.name, "text-blue-600 hover:underline")
                    ) : (
                      <span>{company.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {company.role || 'Not available'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {company.announcementUrl ? (
                      <a
                        href={company.announcementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-words"
                      >
                        {company.announcementUrl}
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {company.individuals || 'Not available'}
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

