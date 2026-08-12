"use client";

import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

const VIEW_W = 780;
const VIEW_H = 600;
const EASE = [0.16, 1, 0.3, 1];

// Camera: content is authored in a coordinate space centered on the hero
// card (0,0), translated to the viewBox center, then scaled — a pure zoom,
// no panning, which keeps the camera motion clean.
const ORIGIN = { x: VIEW_W / 2, y: VIEW_H / 2 - 6 };
const ZOOM_IN = 1.3;
const ZOOM_OUT = 1.05;
const PARALLAX_RANGE = 8;

const CARD_W = 210;
const CARD_H = 160;

// The interactive relationship graph — mirrors the real Asymmetrix entity
// model. Each satellite is a small "mini-card" carrying real field-shaped
// content (not a bare label), with a provenance tag revealed on hover.
const NAMED_NODES = [
  {
    id: "event",
    type: "event",
    x: 0,
    y: -138,
    w: 196,
    h: 66,
    big: true,
    primary: "Acquired by Halcyon Capital",
    secondary: "$210M · Mar 2026",
    detail: "Confirmed deal",
  },
  {
    id: "financial",
    type: "financial",
    x: -198,
    y: -125,
    w: 152,
    h: 58,
    primary: "Revenue $22M",
    secondary: "EBITDA 28% · 3.5x",
    detail: "Estimate",
  },
  {
    id: "headcount",
    type: "headcount",
    x: 198,
    y: -125,
    w: 150,
    h: 58,
    primary: "340 employees",
    secondary: "+18% YoY",
    detail: "Source: LinkedIn",
    spark: true,
  },
  {
    id: "investor",
    type: "investor",
    x: -215,
    y: 122,
    w: 156,
    h: 58,
    primary: "Bridgepoint",
    secondary: "18 active D&A deals",
    detail: "Confirmed",
  },
  {
    id: "advisor",
    type: "advisor",
    x: 215,
    y: 122,
    w: 148,
    h: 58,
    primary: "Goldman Sachs",
    secondary: "Sell-side advisor",
    detail: "Confirmed",
  },
  {
    id: "leadership",
    type: "leadership",
    x: -215,
    y: 192,
    w: 138,
    h: 58,
    primary: "Sarah Chen",
    secondary: "Chief Executive Officer",
    detail: "Verified",
  },
  {
    id: "product",
    type: "product",
    x: 0,
    y: 260,
    w: 168,
    h: 58,
    primary: "Core Platform",
    secondary: "Data ingestion & modelling",
    detail: "Verified",
  },
  {
    id: "competitor",
    type: "competitor",
    x: 215,
    y: 192,
    w: 134,
    h: 58,
    primary: "DataForge",
    secondary: "Series B",
    detail: "Tracked",
  },
  {
    id: "competitor2",
    type: "competitor",
    x: -285,
    y: -195,
    w: 134,
    h: 54,
    faint: true,
    primary: "Streamline AI",
    secondary: "Series C",
    detail: "Tracked",
  },
];

const EDGES = [
  { a: "hero", b: "event" },
  { a: "hero", b: "financial" },
  { a: "hero", b: "headcount" },
  { a: "hero", b: "investor" },
  { a: "hero", b: "advisor" },
  { a: "hero", b: "leadership" },
  { a: "hero", b: "product" },
  { a: "hero", b: "competitor", dashed: true },
  { a: "hero", b: "competitor2", dashed: true },
  { a: "competitor", b: "investor" },
];

const POS = { hero: { x: 0, y: 0 }, ...Object.fromEntries(NAMED_NODES.map((n) => [n.id, { x: n.x, y: n.y }])) };

function neighborsOf(id) {
  const set = new Set([id]);
  EDGES.forEach((edge) => {
    if (edge.a === id) set.add(edge.b);
    if (edge.b === id) set.add(edge.a);
  });
  return set;
}

// Deterministic hash — Math.random() during render would desync the
// server-rendered and client-hydrated markup.
function pseudoRandom(seed) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

const AMBIENT_COUNT = 28;
const GOLDEN_ANGLE = 137.50776;

function buildAmbient() {
  const nodes = [];
  for (let i = 0; i < AMBIENT_COUNT; i += 1) {
    const t = i / AMBIENT_COUNT;
    const r = 310 + (418 - 310) * Math.sqrt(t) + (pseudoRandom(i * 9.3 + 4) - 0.5) * 14;
    const angleRad = (i * GOLDEN_ANGLE * Math.PI) / 180;
    nodes.push({
      id: i,
      x: round2(r * Math.cos(angleRad)),
      y: round2(r * Math.sin(angleRad)),
      type: ["company", "investor", "product", "sector"][i % 4],
    });
  }
  return nodes;
}
const AMBIENT_NODES = buildAmbient();
function buildAmbientEdges() {
  const edges = [];
  AMBIENT_NODES.forEach((node, i) => {
    edges.push([node, AMBIENT_NODES[(i + 1) % AMBIENT_COUNT]]);
    if (i % 3 === 0) edges.push([node, AMBIENT_NODES[(i + 11) % AMBIENT_COUNT]]);
  });
  return edges;
}
const AMBIENT_EDGES = buildAmbientEdges();

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function AmbientNode({ node }) {
  const { x, y, type } = node;
  if (type === "company") {
    return <rect x={x - 5} y={y - 3} width={10} height={6} rx={1.3} fill="#FFFFFF" stroke="#536FF0" strokeWidth={0.8} opacity={0.5} />;
  }
  if (type === "investor") return <circle cx={x} cy={y} r={2.6} fill="#536FF0" opacity={0.4} />;
  if (type === "product") return <rect x={x - 2.5} y={y - 2.5} width={5} height={5} rx={1} fill="#F0F3FF" stroke="#3E5EDC" strokeWidth={0.8} opacity={0.6} />;
  return <circle cx={x} cy={y} r={3.6} fill="none" stroke="#203FBF" strokeWidth={0.9} opacity={0.35} />;
}

function Sparkline() {
  return (
    <polyline
      points="0,6 5,4 10,5.5 15,1 20,3 25,-1"
      fill="none"
      stroke="#536FF0"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.8}
    />
  );
}

function SatelliteCard({ node, delay, entered, dimmed, hovered, onEnter, onLeave, reduceMotion }) {
  const { w, h, big, faint, primary, secondary, detail, spark } = node;
  const bg = big ? "#203FBF" : "#FFFFFF";
  const primaryFill = big ? "#FFFFFF" : "#000B29";
  const secondaryFill = big ? "rgba(255,255,255,0.75)" : "#5A6272";

  return (
    // Plain <g> for static position — a motion.g with an `animate` scale/opacity
    // target manages `transform` itself and silently drops a literal transform prop.
    <g transform={`translate(${node.x}, ${node.y})`}>
      <motion.g
        initial={{ opacity: 0, scale: 0.35 }}
        animate={entered ? { opacity: faint ? 0.75 : 1, scale: 1 } : undefined}
        transition={T(reduceMotion, 0.5, delay)}
      >
        <motion.g
          animate={{ opacity: dimmed ? 0.22 : 1, scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.28, ease: EASE }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{ cursor: "pointer" }}
        >
          {/* Subtle halo — only on the primary event card */}
          {!reduceMotion && big && (
            <rect
              x={-w / 2 - 3}
              y={-h / 2 - 3}
              width={w + 6}
              height={h + 6}
              rx={14}
              fill="#3E5EDC"
              className="landing-satellite-pulse"
              style={{ filter: "blur(4px)" }}
            />
          )}

          {/* Drop shadow */}
          <rect x={-w / 2 + 2} y={-h / 2 + 4} width={w} height={h} rx={12} fill="#000B29" opacity={0.08} style={{ filter: "blur(5px)" }} />

          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={12}
            fill={bg}
            stroke={big ? "none" : "rgba(0,11,41,0.08)"}
          />
          <rect x={-w / 2} y={-h / 2} width={3.5} height={h} rx={1.75} fill={big ? "#536FF0" : "#536FF0"} opacity={big ? 0.9 : 0.7} />

          <text x={-w / 2 + 14} y={-h / 2 + 20} fontSize={big ? 12.5 : 11.5} fontWeight="700" fill={primaryFill}>
            {primary}
          </text>
          <text x={-w / 2 + 14} y={-h / 2 + 39} fontSize={9.5} fontWeight="500" fill={secondaryFill}>
            {secondary}
          </text>
          {spark && (
            <g transform={`translate(${w / 2 - 32}, ${-h / 2 + 26})`}>
              <Sparkline />
            </g>
          )}

          <motion.text
            x={-w / 2 + 14}
            y={h / 2 - 9}
            fontSize={7.5}
            fontWeight="700"
            letterSpacing="0.04em"
            fill={big ? "#B9C4F5" : "#536FF0"}
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {detail.toUpperCase()}
          </motion.text>
        </motion.g>
      </motion.g>
    </g>
  );
}

function Edge({ a, b, dashed, delay, entered, dimmed, reduceMotion }) {
  const from = POS[a];
  const to = POS[b];
  return (
    <motion.g initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={T(reduceMotion, 0.4, delay)}>
      <motion.g animate={{ opacity: dimmed ? 0.06 : 1 }} transition={{ duration: 0.25, ease: EASE }}>
        <motion.line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="url(#cgv-line)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={dashed ? "3 4" : undefined}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : undefined}
          transition={T(reduceMotion, 0.55, delay)}
        />
      </motion.g>
    </motion.g>
  );
}

function CardRow({ label, value, x, y, valueSize = 10, delay, reduceMotion }) {
  return (
    <motion.g initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={T(reduceMotion, 0.45, delay)}>
      <text x={x} y={y} fontSize="7" fontWeight="600" letterSpacing="0.06em" fill="#5A6272">
        {label.toUpperCase()}
      </text>
      <text x={x} y={y + 13} fontSize={valueSize} fontWeight="600" fill="#000B29">
        {value}
      </text>
    </motion.g>
  );
}

export function CompanyGraphVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const entered = hasEntered;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.4 });
  const springY = useSpring(my, { stiffness: 55, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  const highlighted = useMemo(() => (hoveredId ? neighborsOf(hoveredId) : null), [hoveredId]);
  const isDimmed = (id) => Boolean(highlighted && !highlighted.has(id));
  const isEdgeDimmed = (edge) => Boolean(hoveredId && edge.a !== hoveredId && edge.b !== hoveredId);

  const handlePointerMove = (event) => {
    if (reduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    mx.set(px * 2 * PARALLAX_RANGE);
    my.set(py * 2 * PARALLAX_RANGE);
  };
  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
    setHoveredId(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl"
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      style={{
        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cgv-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#536FF0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3E5EDC" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <g transform={`translate(${ORIGIN.x}, ${ORIGIN.y})`}>
          <motion.g style={{ x: springX, y: springY }}>
            <motion.g
              style={{ transformOrigin: "0px 0px" }}
              initial={{ scale: ZOOM_IN }}
              animate={entered ? { scale: ZOOM_OUT } : undefined}
              transition={T(reduceMotion, 1.15, 2.0)}
            >
              {/* Ambient market field — communicates scale, not interactive */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={entered ? { opacity: hoveredId ? 0.3 : 1 } : undefined}
                transition={{
                  duration: reduceMotion ? 0 : entered && hoveredId !== null ? 0.3 : 1,
                  delay: reduceMotion || hoveredId !== null ? 0 : 2.15,
                  ease: EASE,
                }}
              >
                {AMBIENT_EDGES.map(([a, b], i) => (
                  <line key={`ae-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#536FF0" strokeWidth={0.7} opacity={0.14} />
                ))}
                {AMBIENT_NODES.map((node) => (
                  <AmbientNode key={node.id} node={node} />
                ))}
              </motion.g>

              {EDGES.map((edge, index) => (
                <Edge
                  key={`${edge.a}-${edge.b}`}
                  a={edge.a}
                  b={edge.b}
                  dashed={edge.dashed}
                  delay={1.05 + index * 0.08}
                  entered={entered}
                  dimmed={isEdgeDimmed(edge)}
                  reduceMotion={reduceMotion}
                />
              ))}

              {NAMED_NODES.map((node, index) => (
                <SatelliteCard
                  key={node.id}
                  node={node}
                  delay={1.25 + index * 0.08}
                  entered={entered}
                  dimmed={isDimmed(node.id)}
                  hovered={hoveredId === node.id}
                  onEnter={() => setHoveredId(node.id)}
                  onLeave={() => setHoveredId(null)}
                  reduceMotion={reduceMotion}
                />
              ))}

              {/* Hero company data card */}
              <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={T(reduceMotion, 0.55, 0)}>
                <motion.g
                  animate={{ opacity: isDimmed("hero") ? 0.4 : 1, scale: hoveredId === "hero" ? 1.02 : 1 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  onMouseEnter={() => setHoveredId("hero")}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer" }}
                >
                  <g transform={`translate(${-CARD_W / 2}, ${-CARD_H / 2})`}>
                    <rect x={3} y={7} width={CARD_W} height={CARD_H} rx={16} fill="#000B29" opacity={0.06} style={{ filter: "blur(6px)" }} />
                    <circle
                      cx={CARD_W / 2}
                      cy={CARD_H / 2}
                      r={CARD_W / 1.7}
                      fill="#536FF0"
                      opacity={0.08}
                      style={{ filter: "blur(18px)" }}
                    />
                    <rect x={0} y={0} width={CARD_W} height={CARD_H} rx={16} fill="#FFFFFF" stroke="rgba(0,11,41,0.08)" />

                    <CardRow label="Company" value="Vantage Analytics" x={16} y={30} valueSize={13} delay={0.3} reduceMotion={reduceMotion} />
                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={T(reduceMotion, 0.4, 0.32)}>
                      <rect x={143} y={13} width={54} height={17} rx={8.5} fill="#F0F3FF" stroke="#536FF0" strokeWidth={0.75} />
                      <text x={170} y={24.5} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#3E5EDC">
                        DATA INFRA
                      </text>
                    </motion.g>

                    <line x1={16} y1={44} x2={CARD_W - 16} y2={44} stroke="rgba(0,11,41,0.08)" />

                    <CardRow label="Stage" value="Series B" x={16} y={62} delay={0.44} reduceMotion={reduceMotion} />
                    <CardRow label="Raised" value="$42M" x={112} y={62} delay={0.5} reduceMotion={reduceMotion} />
                    <CardRow label="Investors" value="Bridgepoint · Insight +3" x={16} y={90} valueSize={9.5} delay={0.58} reduceMotion={reduceMotion} />
                    <CardRow label="Products" value="Core Platform · API Suite" x={16} y={116} valueSize={9.5} delay={0.66} reduceMotion={reduceMotion} />

                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={T(reduceMotion, 0.45, 0.74)}>
                      <circle cx={22} cy={140} r={6.5} fill="#536FF0" opacity={0.85} />
                      <circle cx={32} cy={140} r={6.5} fill="#3E5EDC" opacity={0.85} />
                      <circle cx={42} cy={140} r={6.5} fill="#203FBF" opacity={0.85} />
                      <text x={54} y={143} fontSize="9.5" fontWeight="600" fill="#000B29">
                        12 leaders
                      </text>
                    </motion.g>
                  </g>
                </motion.g>
              </motion.g>
            </motion.g>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
