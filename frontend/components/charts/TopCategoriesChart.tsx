'use client';

import { ResponsiveBar } from '@nivo/bar';

interface CategoryData {
  category: string;
  count: number;
  [key: string]: string | number;
}

interface TopCategoriesChartProps {
  data: CategoryData[];
}

export default function TopCategoriesChart({ data }: TopCategoriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No category data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveBar
        data={data}
        keys={['count']}
        indexBy="category"
        layout="horizontal"
        margin={{ top: 10, right: 30, bottom: 30, left: 100 }}
        padding={0.3}
        colors={['#2563eb']}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
        }}
        enableLabel={false}
        animate={true}
        motionConfig="gentle"
        tooltip={({ data }) => (
          <div className="bg-white px-3 py-2 shadow-lg rounded border border-gray-200">
            <div className="text-sm font-medium text-gray-900">{data.category}</div>
            <div className="text-sm text-gray-600">
              {data.count} question{data.count !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        role="img"
        aria-label="Top question categories horizontal bar chart"
      />
    </div>
  );
}
