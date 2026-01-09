'use client';

import { ResponsivePie } from '@nivo/pie';

interface UserSatisfactionChartProps {
  satisfactionPercentage: number;
}

interface PieDataItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Transforms satisfaction percentage to Nivo pie chart format.
 * Creates positive and negative segments that always sum to 100.
 * Clamps input to 0-100 range.
 */
export function transformSatisfactionData(satisfactionPercentage: number): PieDataItem[] {
  // Clamp to 0-100 range
  const clampedPercentage = Math.max(0, Math.min(100, satisfactionPercentage));
  const negativePercentage = 100 - clampedPercentage;

  return [
    {
      id: 'positive',
      label: 'Positive',
      value: clampedPercentage,
      color: '#10b981', // green-500
    },
    {
      id: 'negative',
      label: 'Negative',
      value: negativePercentage,
      color: '#ef4444', // red-500
    },
  ];
}

export default function UserSatisfactionChart({ satisfactionPercentage }: UserSatisfactionChartProps) {
  // Clamp to 0-100 range for display
  const clampedPercentage = Math.max(0, Math.min(100, satisfactionPercentage));
  const pieData = transformSatisfactionData(satisfactionPercentage);

  return (
    <div className="h-64">
      <ResponsivePie
        data={pieData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerRadius={0.6}
        padAngle={0.5}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        enableArcLinkLabels={false}
        enableArcLabels={false}
        animate={true}
        motionConfig="gentle"
        tooltip={({ datum }) => (
          <div className="bg-white px-3 py-2 shadow-lg rounded border border-gray-200">
            <div className="text-sm font-medium text-gray-900">{datum.label}</div>
            <div className="text-sm text-gray-600">{datum.value.toFixed(1)}%</div>
          </div>
        )}
        layers={[
          'arcs',
          'arcLabels',
          'arcLinkLabels',
          'legends',
          ({ centerX, centerY }) => (
            <text
              key="center-text"
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-2xl font-bold fill-gray-900"
              style={{ fontSize: '24px', fontWeight: 'bold' }}
            >
              {clampedPercentage.toFixed(1)}%
            </text>
          ),
        ]}
        role="img"
        aria-label="User satisfaction donut chart"
      />
    </div>
  );
}
