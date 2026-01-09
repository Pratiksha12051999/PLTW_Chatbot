'use client';

import { ResponsiveBar } from '@nivo/bar';

interface ConversationVolumeData {
  date: string;
  count: number;
  [key: string]: string | number;
}

interface ConversationVolumeChartProps {
  data: ConversationVolumeData[];
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to "Mon D" format (e.g., "Jan 9")
 */
export function formatDateLabel(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return isoDate;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export default function ConversationVolumeChart({ data }: ConversationVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No conversation data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveBar
        data={data}
        keys={['count']}
        indexBy="date"
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        padding={0.3}
        colors={['#2563eb']}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (value) => formatDateLabel(value),
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        enableLabel={false}
        animate={true}
        motionConfig="gentle"
        tooltip={({ data }) => (
          <div className="bg-white px-3 py-2 shadow-lg rounded border border-gray-200">
            <div className="text-sm font-medium text-gray-900">
              {formatDateLabel(data.date as string)}
            </div>
            <div className="text-sm text-gray-600">
              {data.count} conversation{data.count !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        role="img"
        aria-label="Conversation volume bar chart"
      />
    </div>
  );
}
