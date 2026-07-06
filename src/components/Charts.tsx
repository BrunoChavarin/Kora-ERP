import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface ChartProps {
  type: 'area' | 'bar';
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
}

export const Charts: React.FC<ChartProps> = ({
  type,
  data,
  xKey,
  yKey,
  height = 300,
  color = '#2563eb'
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px'
              }}
            />
            <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorUv)" />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px'
              }}
            />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
