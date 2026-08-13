"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useMemo, useRef, useState, useEffect } from "react";

const VIEW_W = 780;
const VIEW_H = 680;
const EASE = [0.16, 1, 0.3, 1];
const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 + 24 };
const RADIUS = 188;
const SWEEP_SECONDS = 7;
const CARD_SCALE = 1.5;
const SWEEP_HIT_WINDOW = 32;

// Illustrative only — anonymised placeholder signals, not real companies or
// deal data. Shape mirrors the real "in-market company" radar (sector tags +
// a transaction-stage label) without exposing anything proprietary. Ring
// distance tracks urgency — the closer to the hub, the sooner it's expected
// to move — and the five stages are the platform's real status vocabulary.
const DEALS = [
  {
    id: "alpha",
    x: 0,
    y: -255,
    ringFrac: 0.92,
    name: "Company A",
    sectors: ["Construction", "Real Estate"],
    stage: "Process on Hold",
    tone: "muted",
  },
  {
    id: "beta",
    x: 243,
    y: -79,
    ringFrac: 0.78,
    name: "Company B",
    sectors: ["ESG", "Supply Chain"],
    stage: "Rumoured in Market",
    tone: "quiet",
  },
  {
    id: "gamma",
    x: 150,
    y: 206,
    ringFrac: 0.6,
    name: "Company C",
    sectors: ["Financial Data"],
    stage: "Reported in Market",
    tone: "reported",
  },
  {
    id: "delta",
    x: -150,
    y: 206,
    ringFrac: 0.44,
    name: "Company D",
    sectors: ["Marketing", "Sales", "People Data"],
    stage: "Transaction Anticipated within 18 Months",
    tone: "active",
  },
  {
    id: "epsilon",
    x: -243,
    y: -79,
    ringFrac: 0.28,
    name: "Company E",
    sectors: ["GRC", "Compliance"],
    stage: "Transaction Anticipated within 6 Months",
    tone: "hot",
  },
];

const TONE_STYLES = {
  hot: { dot: "#203FBF", chipBg: "#E8ECFE", chipText: "#203FBF" },
  active: { dot: "#3E5EDC", chipBg: "#F0F3FF", chipText: "#3E5EDC" },
  reported: { dot: "#536FF0", chipBg: "#F0F3FF", chipText: "#3E5EDC" },
  quiet: { dot: "#8791A8", chipBg: "#F3F4F8", chipText: "#5A6272" },
  muted: { dot: "#B7BECD", chipBg: "#F3F4F8", chipText: "#8791A8" },
};

function angleFromXY(x, y) {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

function pseudoRandom(seed) {
  const v = Math.sin(seed) * 43758.5453;
  return v - Math.floor(v);
}

const NOISE_COUNT = 16;
function buildNoise() {
  const nodes = [];
  for (let i = 0; i < NOISE_COUNT; i += 1) {
    const angle = (i / NOISE_COUNT) * 360 + pseudoRandom(i * 3.1) * 12;
    const frac = 0.28 + pseudoRandom(i * 7.7 + 2) * 0.62;
    const rad = (angle * Math.PI) / 180;
    nodes.push({
      id: i,
      x: Math.round(frac * RADIUS * Math.sin(rad) * 100) / 100,
      y: Math.round(-frac * RADIUS * Math.cos(rad) * 100) / 100,
    });
  }
  return nodes;
}
const NOISE_NODES = buildNoise();

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function angleDiff(a, b) {
  return ((a - b + 540) % 360) - 180;
}

function isSweepNearDot(sweepAngle, dotAngle) {
  return Math.abs(angleDiff(sweepAngle, dotAngle)) <= SWEEP_HIT_WINDOW;
}

function wrapText(text, maxWidth, fontSize) {
  const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function getCardMetrics(deal) {
  const cardW = Math.round(152 * CARD_SCALE);
  const padX = Math.round(13 * CARD_SCALE);
  const contentW = cardW - padX * 2;
  const nameFont = 10.5 * CARD_SCALE;
  const sectorFont = 7.8 * CARD_SCALE;
  const stageFont = 7.2 * CARD_SCALE;
  const sectorLines = wrapText(deal.sectors.join(" · "), contentW, sectorFont);
  const stageLines = wrapText(deal.stage.toUpperCase(), contentW - 6, stageFont);
  const sectorLineH = 10 * CARD_SCALE;
  const chipLineH = 9 * CARD_SCALE;
  const chipPadY = 3.5 * CARD_SCALE;
  const chipH = Math.max(16 * CARD_SCALE, chipPadY * 2 + stageLines.length * chipLineH);
  const nameY = 17 * CARD_SCALE;
  const sectorY = nameY + 13 * CARD_SCALE;
  const chipY = sectorY + sectorLines.length * sectorLineH + 6 * CARD_SCALE;
  const cardH = chipY + chipH + 12 * CARD_SCALE;
  const cardRx = 11 * CARD_SCALE;
  const chipRx = 8 * CARD_SCALE;
  const accentW = 3 * CARD_SCALE;

  return {
    cardW,
    cardH,
    padX,
    contentW,
    sectorLines,
    stageLines,
    sectorY,
    sectorLineH,
    chipY,
    chipH,
    chipLineH,
    nameY,
    nameFont,
    sectorFont,
    stageFont,
    cardRx,
    chipRx,
    accentW,
  };
}

function DealBlip({ deal, index, entered, reduceMotion, hovered, sweepActive, onEnter, onLeave }) {
  const angleDeg = useMemo(() => angleFromXY(deal.x, deal.y), [deal.x, deal.y]);
  const delay = -(angleDeg / 360) * SWEEP_SECONDS;
  const dotX = deal.ringFrac * RADIUS * Math.sin((angleDeg * Math.PI) / 180);
  const dotY = -deal.ringFrac * RADIUS * Math.cos((angleDeg * Math.PI) / 180);
  const tone = TONE_STYLES[deal.tone] ?? TONE_STYLES.quiet;
  const metrics = useMemo(() => getCardMetrics(deal), [deal]);
  const {
    cardW,
    cardH,
    padX,
    contentW,
    sectorLines,
    stageLines,
    sectorY,
    sectorLineH,
    chipY,
    chipH,
    chipLineH,
    nameY,
    nameFont,
    sectorFont,
    stageFont,
    cardRx,
    chipRx,
    accentW,
  } = metrics;
  const stageStartY = chipY + (chipH - stageLines.length * chipLineH) / 2 + chipLineH * 0.75;
  const cardLeft = deal.x < 0;
  const showCard = hovered || sweepActive;
  const highlightDot = hovered || sweepActive;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={entered ? { opacity: 1, scale: 1 } : undefined}
      transition={T(reduceMotion, 0.5, 0.9 + index * 0.1)}
    >
      {/* connecting line from ring dot to card */}
      <line
        x1={dotX}
        y1={dotY}
        x2={deal.x + (cardLeft ? cardW / 2 : -cardW / 2)}
        y2={deal.y}
        stroke={tone.dot}
        strokeWidth={1}
        strokeOpacity={0.28}
        strokeDasharray="2 4"
      />

      {/* radar dot on the ring, pulses in sync with the sweep. A larger,
          invisible circle widens the hover hit-area beyond the tiny visible
          dot without affecting how it looks. */}
      <g style={{ cursor: "pointer" }} onMouseEnter={() => onEnter(deal.id)} onMouseLeave={() => onLeave()}>
        <circle cx={dotX} cy={dotY} r={18} fill="transparent" />
        <circle
          cx={dotX}
          cy={dotY}
          r={highlightDot ? 9 : 6.5}
          fill={tone.dot}
          opacity={highlightDot ? 1 : 0.75}
          style={{ transition: "r 0.2s ease, opacity 0.2s ease" }}
        />
        {!reduceMotion && (
          <circle
            cx={dotX}
            cy={dotY}
            r={6.5}
            fill="none"
            stroke={tone.dot}
            strokeWidth={1.8}
            className={highlightDot ? undefined : "landing-radar-blip-ping"}
            style={{ animationDelay: `${delay}s`, transformOrigin: `${dotX}px ${dotY}px` }}
          />
        )}
      </g>

      {/* signal card — shown when the sweep passes this dot or on hover */}
      <g transform={`translate(${deal.x - cardW / 2}, ${deal.y - cardH / 2})`}>
        <g
          style={{
            opacity: showCard ? 1 : 0,
            transform: showCard ? "translateY(0) scale(1)" : "translateY(6px) scale(0.96)",
            transition: "opacity 0.22s ease, transform 0.28s ease",
            pointerEvents: showCard ? "auto" : "none",
          }}
          onMouseEnter={() => onEnter(deal.id)}
          onMouseLeave={() => onLeave()}
        >
          <rect x={3} y={6} width={cardW} height={cardH} rx={cardRx} fill="#000B29" opacity={0.06} style={{ filter: "blur(4px)" }} />
          <rect x={0} y={0} width={cardW} height={cardH} rx={cardRx} fill="#FFFFFF" stroke="rgba(0,11,41,0.08)" />
          <rect x={0} y={0} width={accentW} height={cardH} rx={accentW / 2} fill={tone.dot} opacity={0.85} />

          <text x={padX} y={nameY} fontSize={nameFont} fontWeight="700" fill="#000B29">
            {deal.name}
          </text>
          <text x={padX} y={sectorY} fontSize={sectorFont} fontWeight="600" fill="#5A6272">
            {sectorLines.map((line, i) => (
              <tspan key={i} x={padX} dy={i === 0 ? 0 : sectorLineH}>
                {line}
              </tspan>
            ))}
          </text>

          <rect x={padX} y={chipY} width={contentW} height={chipH} rx={chipRx} fill={tone.chipBg} />
          <text x={padX + contentW / 2} y={stageStartY} textAnchor="middle" fontSize={stageFont} fontWeight="700" fill={tone.chipText}>
            {stageLines.map((line, i) => (
              <tspan key={i} x={padX + contentW / 2} dy={i === 0 ? 0 : chipLineH}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      </g>
    </motion.g>
  );
}

export function DealRadarVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [sweepAngle, setSweepAngle] = useState(0);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  useEffect(() => {
    if (!entered || reduceMotion) return undefined;

    let raf = 0;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      setSweepAngle(((elapsed / SWEEP_SECONDS) * 360) % 360);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entered, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: "#536FF0" }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
          Deal Radar · live
        </span>
      </div>

      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="drv-sweep" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#536FF0" stopOpacity="0" />
            <stop offset="100%" stopColor="#536FF0" stopOpacity="0.32" />
          </linearGradient>
        </defs>

        <g transform={`translate(${CENTER.x}, ${CENTER.y})`}>
          {/* rings */}
          <motion.g initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={T(reduceMotion, 0.6, 0.1)}>
            {[0.34, 0.67, 1].map((f) => (
              <circle key={f} r={RADIUS * f} fill="none" stroke="rgba(0,11,41,0.09)" strokeWidth={1} strokeDasharray={f === 1 ? undefined : "2 5"} />
            ))}
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const dx = RADIUS * Math.cos(rad);
              const dy = RADIUS * Math.sin(rad);
              return <line key={deg} x1={-dx} y1={-dy} x2={dx} y2={dy} stroke="rgba(0,11,41,0.06)" strokeWidth={1} />;
            })}
          </motion.g>

          {/* faint market noise — not flagged, just texture */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={entered ? { opacity: 0.6 } : undefined}
            transition={T(reduceMotion, 0.8, 0.5)}
          >
            {NOISE_NODES.map((n) => (
              <circle key={n.id} cx={n.x} cy={n.y} r={2} fill="#536FF0" opacity={0.22} />
            ))}
          </motion.g>

          {/* rotating sweep beam */}
          {!reduceMotion && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={entered ? { opacity: 1 } : undefined}
              transition={T(reduceMotion, 0.5, 1.1)}
            >
              <g className="landing-radar-sweep">
                <path d={`M0,0 L0,${-RADIUS} A${RADIUS},${RADIUS} 0 0,1 ${RADIUS * Math.sin((36 * Math.PI) / 180)},${-RADIUS * Math.cos((36 * Math.PI) / 180)} Z`} fill="url(#drv-sweep)" />
              </g>
            </motion.g>
          )}

          {/* center hub */}
          <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={entered ? { opacity: 1, scale: 1 } : undefined} transition={T(reduceMotion, 0.5, 0.2)}>
            <circle r={6} fill="#203FBF" />
            <circle r={6} fill="none" stroke="#536FF0" strokeWidth={1.2} className={reduceMotion ? undefined : "landing-node-glow"} />
          </motion.g>

          {DEALS.map((deal, index) => {
            const dotAngle = angleFromXY(deal.x, deal.y);
            const sweepActive = entered && !reduceMotion && isSweepNearDot(sweepAngle, dotAngle);

            return (
              <DealBlip
                key={deal.id}
                deal={deal}
                index={index}
                entered={entered}
                reduceMotion={reduceMotion}
                hovered={hoveredId === deal.id}
                sweepActive={sweepActive}
                onEnter={setHoveredId}
                onLeave={() => setHoveredId(null)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
