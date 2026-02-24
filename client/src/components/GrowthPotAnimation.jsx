import { useEffect, useMemo, useRef, useState } from "react";

export default function GrowthPotAnimation({ score = 0 }) {
  const safeScore = Math.max(0, score || 0);
  const waterCount = Math.floor(safeScore / 200);
  const stage = safeScore < 2000 ? 0 : safeScore < 5000 ? 1 : safeScore < 8000 ? 2 : 3;

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
        <rect x="0" y="0" width="320" height="220" fill="#eef8ff" />
        <rect x="0" y="150" width="320" height="70" fill="#e8f5ea" />

        <g className="sunGroup">
          <circle cx="50" cy="34" r="12" fill="#ffd35e" stroke="#b8860b" strokeWidth="1.2" />
          <g className="sunRays">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line
                key={i}
                x1="50"
                y1="34"
                x2={50 + Math.cos((Math.PI * 2 * i) / 8) * 20}
                y2={34 + Math.sin((Math.PI * 2 * i) / 8) * 20}
                stroke="#ffd35e"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </g>
        </g>

        <ellipse cx="160" cy="184" rx="68" ry="8" fill="rgba(0,0,0,0.08)" />
        <ellipse cx="160" cy="90" rx="56" ry="12" fill="#d7c1a0" stroke="#6c4a2f" strokeWidth="1.4" />
        <ellipse cx="160" cy="92" rx="49" ry="9" fill="#5f4636" />
        <path d="M104 91 L216 91 L197 176 L123 176 Z" fill="#c9915a" stroke="#6c4a2f" strokeWidth="1.5" />
        <path d="M121 176 L199 176" stroke="#6c4a2f" strokeWidth="1.2" />

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
          <ellipse cx="160" cy="92" rx="4" ry="3" fill="#8e735d" />
        )}

        {stage >= 1 && (
          <g className="plantSway">
            <path d="M160 92 C160 84 160 76 160 66" stroke="#2f6a3e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <ellipse cx="152" cy="68" rx="10" ry="5" fill="#55b867" transform="rotate(-25 152 68)" />
            <ellipse cx="168" cy="67" rx="10" ry="5" fill="#55b867" transform="rotate(25 168 67)" />
          </g>
        )}

        {stage >= 2 && (
          <g className="plantSway">
            <path d="M160 92 C160 82 160 65 160 49" stroke="#2f6a3e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <ellipse cx="148" cy="62" rx="11" ry="5.5" fill="#5fc572" transform="rotate(-30 148 62)" />
            <ellipse cx="172" cy="56" rx="11" ry="5.5" fill="#5fc572" transform="rotate(28 172 56)" />
          </g>
        )}

        {stage >= 3 && (
          <g className="plantSway">
            <path d="M160 92 C160 78 160 58 160 36" stroke="#2f6a3e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <ellipse cx="147" cy="55" rx="11" ry="5" fill="#62ca78" transform="rotate(-32 147 55)" />
            <ellipse cx="173" cy="48" rx="11" ry="5" fill="#62ca78" transform="rotate(30 173 48)" />
            <g className="flowerBloom">
              <ellipse cx="160" cy="24" rx="4.3" ry="7.4" fill="#ff8db0" stroke="#8b2b43" strokeWidth="0.9" />
              <ellipse cx="169" cy="28" rx="4.3" ry="7.4" fill="#ff7ea8" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(38 169 28)" />
              <ellipse cx="173" cy="37" rx="4.3" ry="7.4" fill="#ff8db0" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(78 173 37)" />
              <ellipse cx="166" cy="45" rx="4.3" ry="7.4" fill="#ff7ea8" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(124 166 45)" />
              <ellipse cx="154" cy="45" rx="4.3" ry="7.4" fill="#ff8db0" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(236 154 45)" />
              <ellipse cx="147" cy="37" rx="4.3" ry="7.4" fill="#ff7ea8" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(284 147 37)" />
              <ellipse cx="151" cy="28" rx="4.3" ry="7.4" fill="#ff8db0" stroke="#8b2b43" strokeWidth="0.9" transform="rotate(322 151 28)" />
              <ellipse cx="160" cy="33" rx="5.4" ry="8.6" fill="#f04f87" stroke="#8b2b43" strokeWidth="1.1" />
              <ellipse cx="160" cy="35" rx="3.6" ry="5.8" fill="#d93372" stroke="#8b2b43" strokeWidth="1" />
              <circle cx="160" cy="35" r="1.8" fill="#ffd166" stroke="#8b2b43" strokeWidth="0.8" />
            </g>
          </g>
        )}
      </svg>

      <div className="growthStageText">{stageLabel}</div>
      <div className="growthWaterCount">Waterings: {waterCount}</div>
    </div>
  );
}
