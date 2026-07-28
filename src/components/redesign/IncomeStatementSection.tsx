"use client";

import React, { useMemo } from "react";
import {
  LinkedH,
  T,
} from "./primitives";
import { buildIncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import type { NormalizedIncomeStatementRow } from "@/lib/incomeStatement";
import { IncomeStatementMetricsGrid } from "../company/IncomeStatementMetricsGrid";

export type IncomeStatementRow = NormalizedIncomeStatementRow;

type Props = {
  rows: IncomeStatementRow[];
  currency?: string;
  employeeHistory?: EmployeeTimeSeriesPoint[];
};

export function IncomeStatementTable({
  rows,
  currency = "",
  employeeHistory = [],
}: Props) {
  const model = useMemo(
    () => buildIncomeStatementFinancialsViewModel(rows, employeeHistory, currency),
    [rows, employeeHistory, currency]
  );

  if (!model) return null;
  return <IncomeStatementMetricsGrid model={model} />;
}

export function IncomeStatementSection({
  rows,
  currency = "",
  employeeHistory = [],
}: Props) {
  const titleCurrency = currency.trim();
  const model = useMemo(
    () => buildIncomeStatementFinancialsViewModel(rows, employeeHistory, currency),
    [rows, employeeHistory, currency]
  );

  if (!model) return null;

  return (
    <div
      style={{
        marginTop: 16,
        marginLeft: -16,
        marginRight: -16,
        borderTop: `1px solid ${T.hair}`,
      }}
    >
      <LinkedH showArrow={false}>
        Income statement{titleCurrency ? ` (${titleCurrency})` : ""}
      </LinkedH>
      <IncomeStatementMetricsGrid model={model} />
    </div>
  );
}
