'use client';

import { ResponsivePie } from '@nivo/pie';

interface EscalationReasonsData {
  no_answer: number;
  user_not_satisfied: number;
  requested_agent: number;
}

interface EscalationReasonsChartProps {
  data: EscalationReasonsData;
  escalationRate: number;
}

interface PieDataItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Transforms escalation reasons data to Nivo pie chart format.
 * Preserves the total count across all segments.
 */
export function transformEscalationData(data: EscalationReasonsData): PieDataItem[] {
  return [
    {
      id: 'no_answer',
      label: 'No answer',
      value: data.no_answer,
      color: '#1e3a8a', // blue-900
    },
    {
      id: 'not_satisfied',
      label: 'Not satisfied',
      value: data.user_not_satisfied,
      color: '#2563eb', // blue-600
    },
    {
      id: 'requested_agent',
      label: 'Requested agent',
      value: data.requested_agent,
      color: '#93c5fd', // blue-300
    },
  ];
}

export default function EscalationReasonsChart({ data, escalationRate }: EscalationReasonsChartProps) {
  const totalEscalations = data.no_answer + data.user_not_satisfied + data.requested_agent;

  if (totalEscalations === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No escalations
      </div>
    );
  }

  const pieData = transformEscalationData(data);

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
            <div className="text-sm text-gray-600">{datum.value} escalation{datum.value !== 1 ? 's' : ''}</div>
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
              {escalationRate.toFixed(1)}%
            </text>
          ),
        ]}
        role="img"
        aria-label="Escalation reasons donut chart"
      />
    </div>
  );
}
