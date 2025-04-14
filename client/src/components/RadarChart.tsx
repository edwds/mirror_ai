import React from "react";
import { CategoryScores } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface RadarChartProps {
  scores: CategoryScores;
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ scores = {}, size = 300 }) => {
  const { t } = useTranslation();

  // Handle case where scores might be null or incomplete
  const safeScores: CategoryScores = {
    composition: typeof scores?.composition === 'number' ? scores.composition : 50,
    lighting: typeof scores?.lighting === 'number' ? scores.lighting : 50,
    color: typeof scores?.color === 'number' ? scores.color : 50,
    focus: typeof scores?.focus === 'number' ? scores.focus : 50,
    creativity: typeof scores?.creativity === 'number' ? scores.creativity : 50
  };

  // Define the five categories
  const categories = [
    {
      name: t("results.categories.composition"),
      key: "composition" as keyof CategoryScores,
      angle: 0,
    },
    {
      name: t("results.categories.lighting"),
      key: "lighting" as keyof CategoryScores,
      angle: 72,
    },
    {
      name: t("results.categories.color"),
      key: "color" as keyof CategoryScores,
      angle: 144,
    },
    {
      name: t("results.categories.focus"),
      key: "focus" as keyof CategoryScores,
      angle: 216,
    },
    {
      name: t("results.categories.creativity"),
      key: "creativity" as keyof CategoryScores,
      angle: 288,
    },
  ];

  // Calculate the radar points based on scores
  const calculateRadarPoint = (category: (typeof categories)[0]) => {
    const value = safeScores[category.key];
    const radius = (value / 100) * 80; // 80% of chart radius for data points
    const centerX = 100; // Center X coordinate
    const centerY = 100; // Center Y coordinate
    const angleRad = (category.angle - 90) * (Math.PI / 180); // Convert angle to radians, -90 to start from top

    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);

    return { x, y };
  };

  // Generate points for the data polygon
  const radarPoints = categories.map(calculateRadarPoint);

  // Create background pentagons at different levels
  const createBackgroundPolygon = (level: number) => {
    const ratio = level / 100;
    return categories
      .map((cat) => {
        const angle = (cat.angle - 90) * (Math.PI / 180);
        const radius = 80 * ratio; // 80% of chart radius for background
        return `${100 + radius * Math.cos(angle)},${100 + radius * Math.sin(angle)}`;
      })
      .join(" ");
  };

  const backgroundLevels = [20, 40, 60, 80, 100];

  return (
    <div className="relative w-full aspect-square" style={{ maxWidth: size }}>
      <svg viewBox="-20 -20 240 240" className="w-full h-full">
        {/* Background Pentagons */}
        {backgroundLevels.map((level) => (
          <polygon
            key={`bg-${level}`}
            points={createBackgroundPolygon(level)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
        ))}

        {/* Axes */}
        {categories.map((cat) => {
          const angle = (cat.angle - 90) * (Math.PI / 180);
          const endX = 100 + 80 * Math.cos(angle);
          const endY = 100 + 80 * Math.sin(angle);

          return (
            <line
              key={`axis-${cat.key}`}
              x1="100"
              y1="100"
              x2={endX}
              y2={endY}
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Data Polygon */}
        <polygon
          points={radarPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(79, 70, 229, 0.15)"
          stroke="url(#gradient)"
          strokeWidth="2"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Data Points */}
        {radarPoints.map((point, index) => (
          <circle
            key={`point-${categories[index].key}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#4f46e5"
          />
        ))}

        {/* Labels */}
        {categories.map((cat) => {
          const score = safeScores[cat.key];
          const angle = (cat.angle - 90) * (Math.PI / 180);
          const labelRadius = 95; // Position labels outside the chart area
          const x = 100 + labelRadius * Math.cos(angle);
          const y = 100 + labelRadius * Math.sin(angle);

          return (
            <text
              key={`label-${cat.key}`}
              x={x}
              y={y}
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
            >
              {cat.name} ({score})
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;
