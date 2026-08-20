"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PeriodFilterState } from "./periodFilterUtils";

export type BreakdownChartItem = {
  key: string | number;
  label: string;
  count: number;
  pct?: number;
  color?: string;
};

export type TimeSeriesPoint = Record<string, string | number>;

const STACK_SEGMENT_GAP = 3;
const TOP_N_DEFAULT = 7;

export function rollupTopN(
  items: BreakdownChartItem[],
  topN = TOP_N_DEFAULT
): BreakdownChartItem[] {
  if (items.length <= topN) return items;

  const sorted = items.slice().sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);
  const otherPct = rest.reduce((sum, item) => sum + (item.pct ?? 0), 0);

  if (otherCount <= 0) return top;

  return [
    ...top,
    {
      key: "__other__",
      label: "Other",
      count: otherCount,
      pct: otherPct,
    },
  ];
}

export function appendTimeGranularity(
  params: URLSearchParams,
  period: PeriodFilterState
): void {
  const granularity =
    period.periodType === "this_month" ||
    period.periodType === "specific_month"
      ? "day"
      : "month";
  params.set("time_granularity", granularity);
}

export function formatTimeBucketLabel(bucket: string): string {
  const trimmed = bucket.trim();
  const dayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    const d = new Date(
      Number(dayMatch[1]),
      Number(dayMatch[2]) - 1,
      Number(dayMatch[3])
    );
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  const monthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const d = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
  }

  return trimmed;
}

function formatMetric(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "0";
}

export function InlineChartLegend(props: {
  items: Array<{ label: string; count: number; color: string }>;
}) {
  const { items } = props;
  if (items.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>
            {item.label}{" "}
            <span className="font-medium text-gray-900">{formatMetric(item.count)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function BreakdownDonutChart(props: {
  title: string;
  items: BreakdownChartItem[];
  colorForLabel: (label: string, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const { title, items, colorForLabel, loading, emptyMessage = "No data" } = props;

  const chartItems = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        color: item.color ?? colorForLabel(item.label, index),
      })),
    [colorForLabel, items]
  );

  const total = useMemo(
    () => chartItems.reduce((sum, item) => sum + item.count, 0),
    [chartItems]
  );

  return (
    <div className="flex h-full flex-col rounded border bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading chart…</p>
      ) : chartItems.length === 0 || total === 0 ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <>
          <div className="relative mx-auto h-56 w-full max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartItems}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartItems.map((item) => (
                    <Cell key={String(item.key)} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, item) => [
                    `${value} (${item?.payload?.pct != null ? `${Number(item.payload.pct).toFixed(1)}%` : ""})`,
                    item?.payload?.label,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-gray-900">{total}</span>
              <span className="text-xs text-gray-500">total</span>
            </div>
          </div>
          <InlineChartLegend
            items={chartItems.map((item) => ({
              label: item.label,
              count: item.count,
              color: item.color!,
            }))}
          />
        </>
      )}
    </div>
  );
}

export function TopNHorizontalBarChart(props: {
  title: string;
  items: BreakdownChartItem[];
  barColor?: string;
  topN?: number;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const {
    title,
    items,
    barColor = "#2563eb",
    topN = TOP_N_DEFAULT,
    loading,
    emptyMessage = "No data",
  } = props;

  const chartItems = useMemo(() => {
    const rolled = rollupTopN(items, topN);
    return rolled
      .slice()
      .sort((a, b) => a.count - b.count)
      .map((item) => ({
        ...item,
        displayLabel:
          item.label.length > 28 ? `${item.label.slice(0, 26)}…` : item.label,
      }));
  }, [items, topN]);

  return (
    <div className="flex h-full flex-col rounded border bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading chart…</p>
      ) : chartItems.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartItems}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="displayLabel"
                width={112}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [value, "Count"]}
                labelFormatter={(_label, payload) =>
                  payload?.[0]?.payload?.label ?? _label
                }
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {chartItems.map((item) => (
                  <Cell
                    key={String(item.key)}
                    fill={item.color ?? barColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && items.length > topN && (
        <p className="mt-2 text-xs text-gray-500">
          Showing top {topN} — see table below for full breakdown.
        </p>
      )}
    </div>
  );
}

type StackedBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: TimeSeriesPoint;
  dataKey?: string;
  stackKeys?: string[];
};

function StackedBarSegment(props: StackedBarShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "#64748b",
    payload,
    dataKey,
    stackKeys = [],
  } = props;

  if (!height || height <= 0) return null;

  const activeKeys = stackKeys.filter(
    (key) => Number(payload?.[key] ?? 0) > 0
  );
  const isTop = dataKey === activeKeys[activeKeys.length - 1];
  const isBottom = dataKey === activeKeys[0];
  const gap = STACK_SEGMENT_GAP;
  const adjustedHeight = Math.max(0, height - (isBottom ? gap / 2 : gap));
  const adjustedY = y + (isBottom ? 0 : gap / 2);
  const radius = isTop ? 6 : 0;

  if (!isTop) {
    return (
      <rect
        x={x}
        y={adjustedY}
        width={width}
        height={adjustedHeight}
        fill={fill}
      />
    );
  }

  const right = x + width;
  const bottom = adjustedY + adjustedHeight;
  const path = `
    M ${x},${adjustedY + radius}
    Q ${x},${adjustedY} ${x + radius},${adjustedY}
    L ${right - radius},${adjustedY}
    Q ${right},${adjustedY} ${right},${adjustedY + radius}
    L ${right},${bottom}
    L ${x},${bottom}
    Z
  `;

  return <path d={path} fill={fill} />;
}

export function StackedTimeSeriesChart(props: {
  title: string;
  data: TimeSeriesPoint[];
  bucketKey?: string;
  stackKeys: string[];
  colorForKey: (key: string, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  headerExtra?: ReactNode;
}) {
  const {
    title,
    data,
    bucketKey = "month",
    stackKeys,
    colorForKey,
    loading,
    emptyMessage = "No data",
    headerExtra,
  } = props;

  const formattedData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        bucketLabel: formatTimeBucketLabel(String(row[bucketKey] ?? "")),
      })),
    [bucketKey, data]
  );

  const legendItems = useMemo(() => {
    const totals = new Map<string, number>();
    stackKeys.forEach((key) => totals.set(key, 0));
    formattedData.forEach((row) => {
      const point = row as TimeSeriesPoint;
      stackKeys.forEach((key) => {
        totals.set(key, (totals.get(key) ?? 0) + (Number(point[key]) || 0));
      });
    });
    return stackKeys.map((key, index) => ({
      label: key,
      count: totals.get(key) ?? 0,
      color: colorForKey(key, index),
    }));
  }, [colorForKey, formattedData, stackKeys]);

  const barSize = formattedData.length <= 1 ? 72 : formattedData.length <= 5 ? 48 : 32;
  const categoryGap =
    formattedData.length <= 1 ? "62%" : formattedData.length <= 3 ? "35%" : "18%";

  return (
    <div className="rounded border bg-white p-4">
      {(title || headerExtra) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          ) : (
            <span />
          )}
          {headerExtra}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading chart…</p>
      ) : formattedData.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedData}
                barCategoryGap={categoryGap}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="bucketLabel"
                  tick={{ fontSize: 12 }}
                  interval={formattedData.length > 12 ? "preserveStartEnd" : 0}
                  angle={formattedData.length > 8 ? -35 : 0}
                  textAnchor={formattedData.length > 8 ? "end" : "middle"}
                  height={formattedData.length > 8 ? 56 : 32}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as TimeSeriesPoint | undefined;
                    return row?.[bucketKey] ? String(row[bucketKey]) : _label;
                  }}
                />
                {stackKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="time-series"
                    fill={colorForKey(key, index)}
                    barSize={barSize}
                    shape={(shapeProps: unknown) => (
                      <StackedBarSegment
                        {...(shapeProps as StackedBarShapeProps)}
                        stackKeys={stackKeys}
                      />
                    )}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <InlineChartLegend items={legendItems} />
        </>
      )}
    </div>
  );
}

export function buildTimeSeriesData(args: {
  rows: Array<{ bucket: string; stackKey: string; count: number }>;
  bucketKey?: string;
}): { data: TimeSeriesPoint[]; stackKeys: string[] } {
  const { rows, bucketKey = "month" } = args;
  const byBucket = new Map<string, TimeSeriesPoint>();
  const stackKeys = new Set<string>();

  rows.forEach((row) => {
    stackKeys.add(row.stackKey);
    const existing = byBucket.get(row.bucket) ?? { [bucketKey]: row.bucket };
    existing[row.stackKey] =
      (Number(existing[row.stackKey]) || 0) + (Number(row.count) || 0);
    byBucket.set(row.bucket, existing);
  });

  return {
    data: Array.from(byBucket.values()).sort((a, b) =>
      String(a[bucketKey]).localeCompare(String(b[bucketKey]))
    ),
    stackKeys: Array.from(stackKeys),
  };
}
