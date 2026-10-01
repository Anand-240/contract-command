import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from './chartTheme';
import { formatMoneyShort } from '@/utils';

export interface ContractStatusDatum {
  status: string;
  label: string;
  count: number;
  value: number;
}

const FILL: Record<string, string> = {
  draft: CHART.neutral,
  under_review: CHART.caution,
  rejected: CHART.neutral,
  active: CHART.brand,
  amended: CHART.brandMuted,
  closed: CHART.neutral,
};

export function ContractStatusChart({ data }: { data: ContractStatusDatum[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.axisTick} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={CHART.axisTick} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(42,74,115,.05)' }}
            contentStyle={CHART.tooltip}
            formatter={(value: number, _name, item) => [
              `${value} ${value === 1 ? 'contract' : 'contracts'}, ${formatMoneyShort(
                (item.payload as ContractStatusDatum).value,
              )}`,
              'Contracts',
            ]}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} animationDuration={250}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={FILL[entry.status] ?? CHART.neutral} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
