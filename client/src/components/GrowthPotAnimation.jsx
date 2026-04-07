import { useEffect, useMemo, useRef, useState } from "react";

function hashText(text) {
  let hash = 0;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getFlowerPalette(seedKey) {
  const palettes = [
    { petalA: "#ff8db0", petalB: "#ff7ea8", petalCore: "#f04f87", petalInner: "#d93372", stroke: "#8b2b43", leaf: "#62ca78", pot: "#c9915a", potShade: "#b87f49" },
    { petalA: "#ffb347", petalB: "#ff9f1c", petalCore: "#ff7b00", petalInner: "#e36414", stroke: "#8a3b12", leaf: "#58bc5e", pot: "#bf8850", potShade: "#ab7441" },
    { petalA: "#9b8cff", petalB: "#7a6cff", petalCore: "#6254e8", petalInner: "#4f46c8", stroke: "#352f82", leaf: "#5fca7c", pot: "#b78261", potShade: "#9f6a49" },
    { petalA: "#ff6b6b", petalB: "#ff8787", petalCore: "#ef4444", petalInner: "#dc2626", stroke: "#8b1e1e", leaf: "#64c96b", pot: "#ce8d57", potShade: "#b77845" },
    { petalA: "#ffd166", petalB: "#ffca3a", petalCore: "#f4b400", petalInner: "#dd9a00", stroke: "#8a6410", leaf: "#72c96c", pot: "#d19962", potShade: "#ba814f" },
    { petalA: "#6ee7b7", petalB: "#34d399", petalCore: "#10b981", petalInner: "#059669", stroke: "#166534", leaf: "#5fcf88", pot: "#c78756", potShade: "#b17143" }
  ];
  return palettes[hashText(seedKey) % palettes.length];
}

function getPlantVariant(seedKey) {
  const hash = hashText(seedKey);
  return {
    petalCount: 6 + (hash % 3),
    petalLength: 8.4 + (hash % 4) * 0.9,
    petalWidth: 4.4 + ((hash >> 2) % 3) * 0.5,
    bloomScale: 1.08 + ((hash >> 4) % 4) * 0.08,
    bloomTilt: -10 + ((hash >> 6) % 21),
    leafTilt: -32 + ((hash >> 8) % 14),
    leafSize: 1 + ((hash >> 10) % 3) * 0.08
  };
}

export default function GrowthPotAnimation({ score = 0, studentKey = "" }) {
  const safeScore = Math.max(0, score || 0);
  const waterCount = Math.floor(safeScore / 200);
  const stage = safeScore < 200 ? 0 : safeScore < 1500 ? 1 : safeScore < 3000 ? 2 : 3;
  const flowerPalette = useMemo(() => getFlowerPalette(studentKey), [studentKey]);
  const plantVariant = useMemo(() => getPlantVariant(studentKey), [studentKey]);

  const [showWaterBurst, setShowWaterBurst] = useState(false);
  const [showPitcher, setShowPitcher] = useState(false);
  const prevWaterCount = useRef(waterCount);

  useEffect(() => {
    if (waterCount > prevWaterCount.current) {
      setShowPitcher(true);
      const t1 = setTimeout(() => setShowWaterBurst(true), 500);
      const t2 = setTimeout(() => setShowWaterBurst(false), 2100);
      const t3 = setTimeout(() => setShowPitcher(false), 3000);
      prevWaterCount.current = waterCount;
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    prevWaterCount.current = waterCount;
    return undefined;
  }, [waterCount]);

  const stageLabel = useMemo(() => {
    if (stage === 0) return "Seed in pot";
    if (stage === 1) return "Sprout";
    if (stage === 2) return "Growing plant";
    return "Flowering plant";
  }, [stage]);

  return (
    <div className="growthPotBox" aria-label="Growing plant">
      <svg className="growthCanvas" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="growthSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dff2ff" />
            <stop offset="65%" stopColor="#f3fbff" />
            <stop offset="100%" stopColor="#f9fff3" />
          </linearGradient>
          <linearGradient id="growthGround" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#cde7c8" />
            <stop offset="100%" stopColor="#dff0cf" />
          </linearGradient>
          <linearGradient id="growthBackHill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d8ebd7" />
            <stop offset="100%" stopColor="#cfe6d2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="320" height="220" fill="url(#growthSky)" />
        <g opacity="0.95">
          <ellipse cx="72" cy="48" rx="23" ry="10" fill="#ffffff" />
          <ellipse cx="90" cy="44" rx="18" ry="11" fill="#ffffff" />
          <ellipse cx="108" cy="48" rx="22" ry="10" fill="#ffffff" />
          <ellipse cx="252" cy="58" rx="24" ry="10" fill="#ffffff" />
          <ellipse cx="270" cy="54" rx="19" ry="11" fill="#ffffff" />
          <ellipse cx="289" cy="58" rx="23" ry="10" fill="#ffffff" />
        </g>
        <rect x="0" y="150" width="320" height="70" fill="url(#growthGround)" />
        <path d="M0 156 C42 134, 93 133, 138 147 C187 163, 243 166, 320 146 L320 220 L0 220 Z" fill="url(#growthBackHill)" />
        <path d="M0 174 C51 160, 109 162, 164 176 C215 188, 266 187, 320 171 L320 220 L0 220 Z" fill="#c2ddc1" opacity="0.96" />
        <g opacity="0.7">
          <path d="M24 155 L24 130" stroke="#a37f5d" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 131 C19 124, 18 118, 24 111 C30 118, 29 124, 24 131" fill="#8fd46d" />
          <path d="M297 154 L297 128" stroke="#a37f5d" strokeWidth="3" strokeLinecap="round" />
          <path d="M297 129 C292 121, 291 114, 297 106 C303 114, 302 121, 297 129" fill="#84cb73" />
        </g>
        <g opacity="0.45">
          {[18, 42, 66, 90, 114, 138, 182, 206, 230, 254, 278, 302].map((x) => (
            <g key={x}>
              <rect x={x} y="144" width="4" height="18" rx="2" fill="#d9c6a6" />
              <rect x={x - 2} y="148" width="8" height="3" rx="1.5" fill="#d9c6a6" />
            </g>
          ))}
        </g>

        <g className="sunGroup">
          <circle cx="54" cy="32" r="18" fill="#ffd35e" stroke="#b8860b" strokeWidth="1.4" />
          <g className="sunRays">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line
                key={i}
                x1="54"
                y1="32"
                x2={54 + Math.cos((Math.PI * 2 * i) / 8) * 28}
                y2={32 + Math.sin((Math.PI * 2 * i) / 8) * 28}
                stroke="#ffd35e"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ))}
          </g>
        </g>

        <ellipse cx="160" cy="189" rx="42" ry="6" fill="rgba(0,0,0,0.12)" />
        <path d="M116 182 C132 176, 188 176, 204 182" fill="none" stroke="rgba(110,139,108,.75)" strokeWidth="3" strokeLinecap="round" />
        <path d="M128 182 H192" stroke="rgba(99, 118, 96, 0.8)" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="160" cy="112" rx="40" ry="9" fill="#d7c1a0" stroke="#6c4a2f" strokeWidth="1.4" />
        <ellipse cx="160" cy="114" rx="34" ry="6.2" fill="#5f4636" />
        <path d="M120 113 L200 113 L188 182 L132 182 Z" fill={flowerPalette.pot} stroke="#6c4a2f" strokeWidth="1.5" />
        <path d="M130 125 L190 125" stroke={flowerPalette.potShade} strokeWidth="2" opacity="0.8" />
        <path d="M138 138 L182 138" stroke={flowerPalette.potShade} strokeWidth="1.8" opacity="0.65" />
        <path d="M145 151 L175 151" stroke={flowerPalette.potShade} strokeWidth="1.6" opacity="0.55" />
        <path d="M133 182 L187 182" stroke="#6c4a2f" strokeWidth="1.3" />

        {showPitcher && (
          <>
            <g className="pitcherGroup">
              <rect x="250" y="40" width="44" height="20" rx="6" fill="#b8c4d2" stroke="#4c6172" strokeWidth="1.2" />
              <path d="M252 42 H292 V36 H255 Z" fill="#d0dae6" stroke="#4c6172" strokeWidth="1.1" />
              <path d="M292 50 L306 46 L308 50 L294 54 Z" fill="#9ba9b8" stroke="#4c6172" strokeWidth="1.1" />
              <path d="M246 42 C236 44 236 58 246 60" fill="none" stroke="#4c6172" strokeWidth="2.2" strokeLinecap="round" />
            </g>
            {showWaterBurst && (
              <g className="waterDrops">
                <circle cx="300" cy="52" r="3" fill="#66c6ff" />
                <circle cx="288" cy="62" r="2.8" fill="#66c6ff" />
                <circle cx="274" cy="72" r="2.6" fill="#66c6ff" />
                <circle cx="260" cy="82" r="2.4" fill="#66c6ff" />
                <circle cx="246" cy="92" r="2.2" fill="#66c6ff" />
              </g>
            )}
          </>
        )}

        {stage === 0 && (
          <ellipse cx="160" cy="114" rx="4" ry="3" fill="#8e735d" />
        )}

        {stage >= 1 && (
          <g className="plantSway">
            <path d="M160 114 C160 103 160 92 160 76" stroke="#2f6a3e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <ellipse cx="151" cy="79" rx={11 * plantVariant.leafSize} ry={5.5 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${plantVariant.leafTilt} 151 79)`} />
            <ellipse cx="169" cy="78" rx={11 * plantVariant.leafSize} ry={5.5 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${Math.abs(plantVariant.leafTilt)} 169 78)`} />
          </g>
        )}

        {stage >= 2 && (
          <g className="plantSway">
            <path d="M160 114 C160 98 160 76 160 52" stroke="#2f6a3e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <ellipse cx="147" cy="71" rx={12 * plantVariant.leafSize} ry={6 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${plantVariant.leafTilt - 2} 147 71)`} />
            <ellipse cx="173" cy="61" rx={12 * plantVariant.leafSize} ry={6 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${Math.abs(plantVariant.leafTilt) - 4} 173 61)`} />
          </g>
        )}

        {stage >= 3 && (
          <g className="plantSway">
            <path d="M160 114 C160 95 160 68 160 30" stroke="#2f6a3e" strokeWidth="4.4" strokeLinecap="round" fill="none" />
            <ellipse cx="145" cy="64" rx={12 * plantVariant.leafSize} ry={5.5 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${plantVariant.leafTilt} 145 64)`} />
            <ellipse cx="175" cy="54" rx={12 * plantVariant.leafSize} ry={5.5 * plantVariant.leafSize} fill={flowerPalette.leaf} transform={`rotate(${Math.abs(plantVariant.leafTilt) - 2} 175 54)`} />
            <g className="flowerBloom" transform={`translate(160 28) rotate(${plantVariant.bloomTilt}) scale(${plantVariant.bloomScale}) translate(-160 -28)`}>
              {Array.from({ length: plantVariant.petalCount }).map((_, i) => {
                const angle = (360 / plantVariant.petalCount) * i;
                return (
                  <ellipse
                    key={i}
                    cx="160"
                    cy={28 - plantVariant.petalLength}
                    rx={plantVariant.petalWidth}
                    ry={plantVariant.petalLength}
                    fill={i % 2 === 0 ? flowerPalette.petalA : flowerPalette.petalB}
                    stroke={flowerPalette.stroke}
                    strokeWidth="0.9"
                    transform={`rotate(${angle} 160 28)`}
                  />
                );
              })}
              <ellipse cx="160" cy="28" rx="6.6" ry="10.2" fill={flowerPalette.petalCore} stroke={flowerPalette.stroke} strokeWidth="1.1" />
              <ellipse cx="160" cy="30" rx="4.5" ry="6.8" fill={flowerPalette.petalInner} stroke={flowerPalette.stroke} strokeWidth="1" />
              <circle cx="160" cy="30" r="2.3" fill="#ffd166" stroke="#8b2b43" strokeWidth="0.8" />
            </g>
          </g>
        )}
      </svg>

      <div className="growthStageText">{stageLabel}</div>
      <div className="growthWaterCount">Waterings: {waterCount}</div>
    </div>
  );
}
