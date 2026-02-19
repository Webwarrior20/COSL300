import { useEffect, useMemo, useRef, useState } from "react";

export default function GrowthPotAnimation({ score = 0 }) {
  const safeScore = Math.max(0, score || 0);
  const waterCount = Math.floor(safeScore / 200);
  const stage = safeScore < 2000 ? 0 : safeScore < 5000 ? 1 : safeScore < 8000 ? 2 : 3;

  const [showWaterBurst, setShowWaterBurst] = useState(false);
  const prevWaterCount = useRef(waterCount);

  useEffect(() => {
    if (waterCount > prevWaterCount.current) {
      setShowWaterBurst(true);
      const t = setTimeout(() => setShowWaterBurst(false), 1300);
      prevWaterCount.current = waterCount;
      return () => clearTimeout(t);
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

        {showWaterBurst && (
          <g className="waterDrops">
            <circle cx="270" cy="66" r="3" fill="#66c6ff" />
            <circle cx="259" cy="74" r="2.6" fill="#66c6ff" />
            <circle cx="248" cy="82" r="2.4" fill="#66c6ff" />
            <circle cx="236" cy="90" r="2.2" fill="#66c6ff" />
          </g>
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
            <circle cx="160" cy="33" r="4.8" fill="#ffd166" stroke="#8b2b43" strokeWidth="1" />
            <circle cx="154" cy="36" r="4.6" fill="#f87197" stroke="#8b2b43" strokeWidth="1" />
            <circle cx="166" cy="36" r="4.6" fill="#f87197" stroke="#8b2b43" strokeWidth="1" />
            <circle cx="160" cy="28" r="4.2" fill="#fb8fb1" stroke="#8b2b43" strokeWidth="1" />
          </g>
        )}
      </svg>

      <div className="growthStageText">{stageLabel}</div>
      <div className="growthWaterCount">Waterings: {waterCount}</div>
    </div>
  );
}
