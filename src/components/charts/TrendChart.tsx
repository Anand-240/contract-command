import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from './chartTheme';

export interface TrendDatum {
  label: string;
  value: number;
}

export function TrendChart({ data, unit = '' }: { data: TrendDatum[]; unit?: string }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.16} />
              <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.axisTick} />
          <YAxis tickLine={false} axisLine={false} tick={CHART.axisTick} />
          <Tooltip
            contentStyle={CHART.tooltip}
            formatter={(value: number) => [`${value}${unit}`, 'Value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.brand}
            strokeWidth={1.75}
            fill="url(#trendFill)"
            animationDuration={250}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
