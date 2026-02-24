import { useEffect, useMemo, useRef, useState } from "react";

function Tree({ x, baseY, scale = 1, growth = 0.3, sway = 0, tone = "mid" }) {
  const trunkColor = tone === "dark" ? "#6a4528" : tone === "light" ? "#7a5232" : "#704b2d";
  const canopyMain = tone === "dark" ? "#2f8448" : tone === "light" ? "#58b06f" : "#3f9d59";
  const canopyShade = tone === "dark" ? "#246c3a" : tone === "light" ? "#489c5f" : "#348a4b";

  const canopyOpacity = 0.18 + growth * 0.82;
  const branchOpacity = 0.45 + growth * 0.55;
  const canopyScale = 0.45 + growth * 0.7;

  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`} className="jungleTreeReal" style={{ animationDelay: `${sway}s` }}>
      <path
        d="M-2 0 C -1 -16, -2 -30, -2 -42 C -2 -53, 2 -53, 3 -42 C 3 -30, 2 -16, 3 0 Z"
        fill={trunkColor}
      />

      <g opacity={branchOpacity}>
        <path d="M0 -34 C -8 -38, -14 -46, -17 -53" stroke={trunkColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M1 -32 C 10 -37, 15 -44, 17 -50" stroke={trunkColor} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </g>

      <g transform={`translate(0 -50) scale(${canopyScale})`} opacity={canopyOpacity}>
        <ellipse cx="0" cy="0" rx="22" ry="14" fill={canopyMain} />
        <ellipse cx="-12" cy="4" rx="13" ry="9" fill={canopyShade} />
        <ellipse cx="12" cy="5" rx="14" ry="10" fill={canopyMain} />
        <ellipse cx="0" cy="-7" rx="12" ry="9" fill="#69c17f" opacity="0.55" />
      </g>
    </g>
  );
}

export default function GrowingJungleAnimation({ points = 0, goal = 5000 }) {
  const safeGoal = Math.max(1, goal);
  const safePoints = Math.max(0, points);
  const pct = Math.max(0, Math.min(100, Math.round((safePoints / safeGoal) * 100)));
  const stage = pct < 25 ? 0 : pct < 50 ? 1 : pct < 75 ? 2 : 3;
  const growth = Math.max(0.08, Math.min(1, safePoints / safeGoal));
  const rainCount = Math.floor(safePoints / 400);

  const [showRain, setShowRain] = useState(false);
  const prevRainCount = useRef(rainCount);

  const allTrees = useMemo(
    () => [
      { x: 36, y: 128, s: 0.82, tone: "dark", d: 0.1 },
      { x: 74, y: 132, s: 0.68, tone: "mid", d: 0.45 },
      { x: 110, y: 126, s: 0.88, tone: "light", d: 0.25 },
      { x: 146, y: 130, s: 0.72, tone: "mid", d: 0.7 },
      { x: 182, y: 124, s: 0.93, tone: "dark", d: 0.38 },
      { x: 216, y: 129, s: 0.76, tone: "light", d: 0.6 },
      { x: 252, y: 125, s: 0.9, tone: "mid", d: 0.3 },
      { x: 286, y: 131, s: 0.73, tone: "dark", d: 0.85 }
    ],
    []
  );
  const visibleCount = stage === 0 ? 2 : stage === 1 ? 4 : stage === 2 ? 6 : 8;
  const trees = allTrees.slice(0, visibleCount);
  const sizeBoost = stage === 0 ? 0.58 : stage === 1 ? 0.76 : stage === 2 ? 0.93 : 1.08;

  useEffect(() => {
    if (rainCount > prevRainCount.current) {
      setShowRain(true);
      const timer = setTimeout(() => setShowRain(false), 2300);
      prevRainCount.current = rainCount;
      return () => clearTimeout(timer);
    }
    prevRainCount.current = rainCount;
    return undefined;
  }, [rainCount]);

  return (
    <div className="jungleBox" aria-label="Growing jungle animation">
      <svg className="jungleSvg" viewBox="0 0 320 150" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jSkyReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cce5f9" />
            <stop offset="65%" stopColor="#d8f1dc" />
            <stop offset="100%" stopColor="#cbe9cf" />
          </linearGradient>
          <linearGradient id="jGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8dc08f" />
            <stop offset="100%" stopColor="#6fae74" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="320" height="150" fill="url(#jSkyReal)" />

        <g className="jungleSunGroup" transform="translate(30 24)">
          <circle r="9" fill="#ffd45f" stroke="#9f7b24" strokeWidth="1" />
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos((Math.PI * 2 * i) / 10) * 16}
              y2={Math.sin((Math.PI * 2 * i) / 10) * 16}
              stroke="#ffd45f"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}
        </g>

        <g className="jungleCloudFloat">
          <ellipse cx="254" cy="26" rx="22" ry="9" fill="#f4f8fc" />
          <ellipse cx="242" cy="28" rx="11" ry="7" fill="#f4f8fc" />
          <ellipse cx="268" cy="28" rx="12" ry="8" fill="#f4f8fc" />
        </g>

        {showRain && (
          <g className="jungleRainGroup">
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={i}
                x1={232 + i * 4}
                y1={36 + (i % 2)}
                x2={228 + i * 4}
                y2={78 + (i % 3) * 2}
                stroke="#5aaee8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        <path d="M0 108 C66 94, 136 96, 196 104 C246 110, 286 108, 320 102 L320 150 L0 150 Z" fill="url(#jGround)" />
        <path d="M0 120 C66 107, 136 109, 196 116 C246 122, 286 121, 320 116 L320 150 L0 150 Z" fill="#7eb987" opacity="0.7" />

        <g opacity={0.35 + growth * 0.5}>
          {trees.slice(0, Math.min(4, trees.length)).map((t, i) => (
            <Tree
              key={`back-${i}`}
              x={t.x}
              baseY={t.y}
              scale={t.s * sizeBoost * 0.86}
              growth={growth * 0.92}
              tone={t.tone}
              sway={t.d}
            />
          ))}
        </g>

        <g opacity={0.5 + growth * 0.45}>
          {trees.map((t, i) => (
            <Tree
              key={`front-${i}`}
              x={t.x}
              baseY={t.y}
              scale={t.s * sizeBoost}
              growth={growth}
              tone={t.tone}
              sway={t.d}
            />
          ))}
        </g>
      </svg>

      <div className="jungleMeta">
        <span>Jungle Growth</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
