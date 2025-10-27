"use client";
import { memo, useCallback, useMemo, useReducer } from "react";
import { scalePoint } from "d3-scale";
import { bisectRight } from "d3-array";

import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { AreaClosed, LinePath } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_RANGE } from "@/lib/yahoo-finance/constants";
import { Range } from "@/types/yahoo-finance";

interface ChartQuote {
  date: Date;
  close: number;
}

interface ChartState {
  close: number;
  date: Date;
  translate: string;
  hovered: boolean;
  x?: number;
  y?: number;
}

interface ChartAction {
  type: "UPDATE" | "CLEAR";
  close?: number;
  date?: Date;
  x?: number;
  y?: number;
  width?: number;
}

// UTILS
const toDate = (d: ChartQuote) => +new Date(d?.date || d);

const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format;

const MemoAreaClosed = memo(AreaClosed);
const MemoLinePath = memo(LinePath);

function reducer(state: ChartState, action: ChartAction): ChartState {
  const initialState: ChartState = {
    close: state.close,
    date: state.date,
    translate: "0%",
    hovered: false,
  };

  switch (action.type) {
    case "UPDATE": {
      return {
        close: action.close || state.close,
        date: action.date || state.date,
        x: action.x,
        y: action.y,
        translate: `-${(1 - (action.x || 0) / (action.width || 1)) * 100}%`,
        hovered: true,
      };
    }
    case "CLEAR": {
      return {
        ...initialState,
        x: undefined,
        y: undefined,
      };
    }
    default:
      return state;
  }
}

interface InteractionsProps {
  width: number;
  height: number;
  xScale: (d: ChartQuote) => number;
  data: ChartQuote[];
  dispatch: React.Dispatch<ChartAction>;
}

function Interactions({
  width,
  height,
  xScale,
  data,
  dispatch,
}: InteractionsProps) {
  const handleMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const pointer = {
        x: Math.max(0, Math.floor(point.x)),
        y: Math.max(0, Math.floor(point.y)),
      };

      const x0 = pointer.x;
      const dates = data.map((d: ChartQuote) => xScale(d));
      const index = bisectRight(dates, x0);

      const d0 = data[index - 1];
      const d1 = data[index];

      let d = d0;
      if (d1 && toDate(d1)) {
        const diff0 = x0.valueOf() - toDate(d0).valueOf();
        const diff1 = toDate(d1).valueOf() - x0.valueOf();
        d = diff0 > diff1 ? d1 : d0;
      }
      dispatch({
        type: "UPDATE",
        close: d.close,
        date: d.date,
        x: pointer.x,
        y: pointer.y,
        width,
      });
    },
    [xScale, data, dispatch, width]
  );

  const handleLeave = useCallback(
    () => dispatch({ type: "CLEAR" }),
    [dispatch]
  );

  return (
    <rect
      width={width}
      height={height}
      rx={12}
      ry={12}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      fill={"transparent"}
    />
  );
}

interface AreaProps {
  mask?: string;
  id: string;
  data: ChartQuote[];
  x: (d: ChartQuote) => number;
  y: (d: ChartQuote) => number;
  yScale: (value: number) => number;
  color: string;
  top?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Area({ mask, id, data, x, y, yScale, color }: AreaProps) {
  return (
    <g strokeLinecap="round" className="stroke-1">
      <LinearGradient
        id={id}
        from={color}
        fromOpacity={0.6}
        to={color}
        toOpacity={0}
      />
      <MemoAreaClosed
        data={data}
        x={x as any}
        y={y as any}
        yScale={yScale as any}
        stroke="transparent"
        fill={`url(#${id})`}
        mask={mask}
      />
      <MemoLinePath
        data={data}
        x={x as any}
        y={y as any}
        stroke={color}
        mask={mask}
      />
    </g>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface GraphSliderProps {
  data: ChartQuote[];
  width: number;
  height: number;
  top: number;
  state: ChartState;
  dispatch: React.Dispatch<ChartAction>;
}

function GraphSlider({
  data,
  width,
  height,
  state,
  dispatch,
}: GraphSliderProps) {
  const xScale = useMemo(
    () => scalePoint<number>().domain(data.map(toDate)).range([0, width]),
    [width, data]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        range: [height, 0],
        domain: [
          Math.min(...data.map((d: ChartQuote) => d.close)),
          Math.max(...data.map((d: ChartQuote) => d.close)),
        ],
      }),
    [height, data]
  );

  const x = useCallback((d: ChartQuote) => xScale(toDate(d)) || 0, [xScale]);
  const y = useCallback((d: ChartQuote) => yScale(d.close), [yScale]);

  const pixelTranslate = (parseFloat(state.translate) / 100) * width;
  const style = {
    transform: `translateX(${pixelTranslate}px)`,
  };

  const isIncreasing = data[data.length - 1].close > data[0].close;

  return (
    <svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
      <mask id="mask" className="w-full">
        <rect x={0} y={0} width={width} height="100%" fill="#000" />
        <rect
          id="boundary"
          x={0}
          y={0}
          width={width}
          height="100%"
          fill="#fff"
          style={style}
        />
      </mask>
      <Area
        id="background"
        data={data}
        x={x}
        y={y}
        yScale={yScale}
        color={state.hovered ? "dodgerblue" : isIncreasing ? "green" : "red"}
      />
      <Area
        id="top"
        data={data}
        x={x}
        y={y}
        yScale={yScale}
        color={state.hovered ? "dodgerblue" : isIncreasing ? "green" : "red"}
        mask="url(#mask)"
      />
      {state.x && (
        <g className="marker">
          <line
            x1={state.x}
            x2={state.x}
            y1={0}
            y2={680}
            stroke={
              state.hovered ? "dodgerblue" : isIncreasing ? "green" : "red"
            }
            strokeWidth={2}
          />
          <circle
            cx={state.x}
            cy={yScale(state.close)}
            r={8}
            fill={state.hovered ? "dodgerblue" : isIncreasing ? "green" : "red"}
            stroke="#FFF"
            strokeWidth={3}
          />
          <text
            textAnchor={state.x + 8 > width / 2 ? "end" : "start"}
            x={state.x + 8 > width / 2 ? state.x - 8 : state.x + 6}
            y={0}
            dy={"0.75em"}
            fill={state.hovered ? "dodgerblue" : isIncreasing ? "green" : "red"}
            className="text-base font-medium"
          >
            {formatCurrency(state.close)}
          </text>
        </g>
      )}
      <Interactions
        width={width}
        height={height}
        data={data}
        xScale={x}
        dispatch={dispatch}
      />
    </svg>
  );
}

interface AreaClosedChartProps {
  chartQuotes: ChartQuote[];
  range: Range;
}

export default function AreaClosedChart({
  chartQuotes,
  range,
}: AreaClosedChartProps) {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  const last = chartQuotes[chartQuotes.length - 1];

  const initialState: ChartState = {
    close: last.close,
    date: last.date,
    translate: "0%",
    hovered: false,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // TIME
  const myDate = new Date(state.date);
  const formattedDate = myDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = myDate
    .toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(":", ".");

  // RANGE
  const createPageURL = useCallback(
    (range: string) => {
      const params = new URLSearchParams(searchParams);

      if (range) {
        params.set("range", range);
      } else {
        params.delete("range");
      }
      return `${pathname}?${params.toString().toLowerCase()}`;
    },
    [searchParams, pathname]
  );

  const rangeOptions: Range[] = ["1d", "1w", "1m", "3m", "1y"];

  const isValidRange = (r: string): r is Range =>
    rangeOptions.includes(r as Range);

  if (!isValidRange(range)) {
    replace(createPageURL(DEFAULT_RANGE));
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const range = e.currentTarget.textContent;
    if (range) {
      replace(createPageURL(range));
    }
  };

  return (
    <div className="w-full min-w-fit">
      <div
        suppressHydrationWarning
        className={
          state.hovered
            ? "flex items-center justify-center font-medium"
            : "invisible"
        }
      >
        {formattedDate}{" "}
        {range !== "3m" && range !== "1y" && "at " + formattedTime}
      </div>
      <div className="h-80">
        {chartQuotes.length > 0 ? (
          <ParentSize>
            {({ width, height }) => (
              <GraphSlider
                data={chartQuotes}
                width={width}
                height={height}
                top={0}
                state={state}
                dispatch={dispatch}
              />
            )}
          </ParentSize>
        ) : (
          <div className="flex justify-center items-center w-full h-80">
            <p>No data available</p>
          </div>
        )}
      </div>
      <div className="flex flex-row mt-1">
        {rangeOptions.map((r) => (
          <button
            key={r}
            onClick={handleClick}
            className={
              range === r
                ? "rounded bg-gray-200 px-4 py-2 font-bold text-gray-900"
                : "rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
            }
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
