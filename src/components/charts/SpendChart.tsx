import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from './chartTheme';
import { formatMoneyShort } from '@/utils';

export interface SpendDatum {
  label: string;
  planned: number;
  committed: number;
  actual: number;
}

export function SpendChart({ data }: { data: SpendDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 4 }} barGap={3} barCategoryGap="26%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.axisTick} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={CHART.axisTick}
            width={60}
            tickFormatter={(value: number) => formatMoneyShort(value)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(42,74,115,.05)' }}
            contentStyle={CHART.tooltip}
            formatter={(value: number, name: string) => [formatMoneyShort(value), name]}
          />
          <Legend
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: '12px', paddingTop: 8, color: CHART.axis }}
          />
          <Bar dataKey="planned" name="Planned" fill={CHART.neutral} radius={[3, 3, 0, 0]} animationDuration={250} />
          <Bar dataKey="committed" name="Committed" fill={CHART.brandMuted} radius={[3, 3, 0, 0]} animationDuration={250} />
          <Bar dataKey="actual" name="Actual spend" fill={CHART.brand} radius={[3, 3, 0, 0]} animationDuration={250} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
