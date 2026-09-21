"use client";

import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

const VIEW_W = 780;
const VIEW_H = 600;
const EASE = [0.16, 1, 0.3, 1];

// Same camera model as the ego-network graph: content authored around a
// hero card at (0,0), translated to the viewBox center, then a pure zoom —
// reused here with the investor as the hub and its portfolio orbiting it.
const ORIGIN = { x: VIEW_W / 2, y: VIEW_H / 2 - 6 };
const ZOOM_IN = 1.3;
const ZOOM_OUT = 1.05;
const PARALLAX_RANGE = 8;
const ORBIT_RADIUS = 232;

const CARD_W = 214;
const CARD_H = 172;

// Illustrative only — anonymised placeholder portfolio, shape mirrors real
// get_investor_current_portfolio / get_investor_past_portfolio fields
// (sector, year invested, stage) without exposing proprietary holdings.
const PORTFOLIO_NODES = [
  {
    id: "coA",
    x: 0,
    y: -ORBIT_RADIUS,
    w: 172,
    h: 66,
    big: true,
    primary: "Company A",
    secondary: "Data Analytics · Series C",
    detail: "Active · 2023",
  },
  {
    id: "coB",
    x: ORBIT_RADIUS * Math.sin((72 * Math.PI) / 180),
    y: -ORBIT_RADIUS * Math.cos((72 * Math.PI) / 180),
    w: 156,
    h: 58,
    primary: "Company B",
    secondary: "Market Research",
    detail: "Active · 2022",
    spark: true,
  },
  {
    id: "coC",
    x: ORBIT_RADIUS * Math.sin((144 * Math.PI) / 180),
    y: -ORBIT_RADIUS * Math.cos((144 * Math.PI) / 180),
    w: 150,
    h: 58,
    primary: "Company C",
    secondary: "Risk & Compliance",
    detail: "Active · 2021",
  },
  {
    id: "coD",
    x: ORBIT_RADIUS * Math.sin((216 * Math.PI) / 180),
    y: -ORBIT_RADIUS * Math.cos((216 * Math.PI) / 180),
    w: 150,
    h: 58,
    primary: "Company D",
    secondary: "ESG Data · Growth",
    detail: "Active · 2024",
  },
  {
    id: "coE",
    x: ORBIT_RADIUS * Math.sin((288 * Math.PI) / 180),
    y: -ORBIT_RADIUS * Math.cos((288 * Math.PI) / 180),
    w: 148,
    h: 58,
    faint: true,
    primary: "Company E",
    secondary: "Marketing Data",
    detail: "Exited · 2020",
  },
];

const EDGES = [
  { a: "hero", b: "coA" },
  { a: "hero", b: "coB" },
  { a: "hero", b: "coC" },
  { a: "hero", b: "coD" },
  { a: "hero", b: "coE", dashed: true },
];

const POS = { hero: { x: 0, y: 0 }, ...Object.fromEntries(PORTFOLIO_NODES.map((n) => [n.id, { x: n.x, y: n.y }])) };

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

const AMBIENT_COUNT = 26;
const GOLDEN_ANGLE = 137.50776;

function buildAmbient() {
  const nodes = [];
  for (let i = 0; i < AMBIENT_COUNT; i += 1) {
    const t = i / AMBIENT_COUNT;
    const r = 300 + (410 - 300) * Math.sqrt(t) + (pseudoRandom(i * 9.3 + 4) - 0.5) * 14;
    const angleRad = (i * GOLDEN_ANGLE * Math.PI) / 180;
    nodes.push({
      id: i,
      x: round2(r * Math.cos(angleRad)),
      y: round2(r * Math.sin(angleRad)),
      type: ["investor", "company"][i % 2],
    });
  }
  return nodes;
}
const AMBIENT_NODES = buildAmbient();

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function AmbientNode({ node }) {
  const { x, y, type } = node;
  if (type === "company") {
    return <rect x={x - 5} y={y - 3} width={10} height={6} rx={1.3} fill="#FFFFFF" stroke="#536FF0" strokeWidth={0.8} opacity={0.45} />;
  }
  return <circle cx={x} cy={y} r={2.6} fill="#536FF0" opacity={0.4} />;
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

function PortfolioCard({ node, delay, entered, dimmed, hovered, onEnter, onLeave, reduceMotion }) {
  const { w, h, big, faint, primary, secondary, detail, spark } = node;
  const bg = big ? "#203FBF" : "#FFFFFF";
  const primaryFill = big ? "#FFFFFF" : "#000B29";
  const secondaryFill = big ? "rgba(255,255,255,0.75)" : "#5A6272";

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <motion.g
        initial={{ opacity: 0, scale: 0.35 }}
        animate={entered ? { opacity: faint ? 0.7 : 1, scale: 1 } : undefined}
        transition={T(reduceMotion, 0.5, delay)}
      >
        <motion.g
          animate={{ opacity: dimmed ? 0.22 : 1, scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.28, ease: EASE }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{ cursor: "pointer" }}
        >
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

          <rect x={-w / 2 + 2} y={-h / 2 + 4} width={w} height={h} rx={12} fill="#000B29" opacity={0.08} style={{ filter: "blur(5px)" }} />

          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} fill={bg} stroke={big ? "none" : "rgba(0,11,41,0.08)"} />
          <rect
            x={-w / 2}
            y={-h / 2}
            width={3.5}
            height={h}
            rx={1.75}
            fill={faint ? "#B7BECD" : "#536FF0"}
            opacity={big ? 0.9 : 0.7}
          />

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
            fill={faint ? "#8791A8" : big ? "#B9C4F5" : "#536FF0"}
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
          stroke="url(#ipv-line)"
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

export function InvestorPortfolioVisual() {
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
      <svg aria-hidden="true" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="ipv-line" gradientUnits="userSpaceOnUse" x1="-320" y1="-320" x2="320" y2="320">
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
                {AMBIENT_NODES.map((node) => (
                  <AmbientNode key={node.id} node={node} />
                ))}
              </motion.g>

              {/* Orbit ring — the portfolio "orbits" the investor hub */}
              <motion.circle
                r={ORBIT_RADIUS}
                fill="none"
                stroke="rgba(0,11,41,0.1)"
                strokeWidth={1}
                strokeDasharray="2 6"
                initial={{ opacity: 0 }}
                animate={entered ? { opacity: hoveredId ? 0.3 : 1 } : undefined}
                transition={T(reduceMotion, 0.6, 0.6)}
              />

              {EDGES.map((edge, index) => (
                <Edge
                  key={`${edge.a}-${edge.b}`}
                  a={edge.a}
                  b={edge.b}
                  dashed={edge.dashed}
                  delay={0.95 + index * 0.09}
                  entered={entered}
                  dimmed={isEdgeDimmed(edge)}
                  reduceMotion={reduceMotion}
                />
              ))}

              {PORTFOLIO_NODES.map((node, index) => (
                <PortfolioCard
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

              {/* Hero investor card */}
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

                    <CardRow label="Investor" value="Investor" x={16} y={30} valueSize={13} delay={0.3} reduceMotion={reduceMotion} />
                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={T(reduceMotion, 0.4, 0.32)}>
                      <rect x={135} y={13} width={62} height={17} rx={8.5} fill="#F0F3FF" stroke="#536FF0" strokeWidth={0.75} />
                      <text x={166} y={24.5} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#3E5EDC">
                        GROWTH EQUITY
                      </text>
                    </motion.g>

                    <line x1={16} y1={44} x2={CARD_W - 16} y2={44} stroke="rgba(0,11,41,0.08)" />

                    <CardRow label="Active" value="Portfolio Cos." x={16} y={62} delay={0.44} reduceMotion={reduceMotion} />
                    <CardRow label="Exited" value="Past Deals" x={112} y={62} delay={0.5} reduceMotion={reduceMotion} />
                    <CardRow label="Sector Focus" value="D&A Horizontals" x={16} y={90} valueSize={9.5} delay={0.58} reduceMotion={reduceMotion} />
                    <CardRow label="HQ" value="City, Country" x={16} y={116} valueSize={9.5} delay={0.66} reduceMotion={reduceMotion} />

                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={T(reduceMotion, 0.45, 0.74)}>
                      <circle cx={22} cy={148} r={6.5} fill="#536FF0" opacity={0.85} />
                      <circle cx={32} cy={148} r={6.5} fill="#3E5EDC" opacity={0.85} />
                      <circle cx={42} cy={148} r={6.5} fill="#203FBF" opacity={0.85} />
                      <text x={54} y={151} fontSize="9.5" fontWeight="600" fill="#000B29">
                        Recent Investments
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
