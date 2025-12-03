import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface MotivationGaugeProps {
  score: number;
  label: string;
  maxScore?: number;
}

const MotivationGauge: React.FC<MotivationGaugeProps> = ({ score, label, maxScore = 10 }) => {
  const percentage = (score / maxScore) * 100;

  const getColor = () => {
    if (score >= 7) return '#10b981'; // green-500
    if (score >= 4) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
  };

  const data = [
    {
      name: label,
      value: percentage,
      fill: getColor()
    }
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
              animationDuration={800}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Score Display in Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getColor() }}>
              {(score ?? 0).toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">/{maxScore}</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-xs font-semibold text-slate-600 mt-2 text-center">
        {label}
      </div>
    </div>
  );
};

export default MotivationGauge;
