'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { FounderRow } from '@/lib/api';
import { toUSDCNum } from '@/lib/format';

/** Stacked bar per campaign: cyan fill = raised, line-color fill = remaining.
 *  Each bar is scaled to the target, so it reads as a progress indicator. */
export function FounderRaiseChart({ campaigns }: { campaigns: FounderRow[] }) {
  const data = campaigns.map((c) => {
    const raised = toUSDCNum(c.totalRaised);
    const target = toUSDCNum(c.raiseTarget);
    return {
      name: c.title.length > 14 ? `${c.title.slice(0, 14)}…` : c.title,
      raised,
      remaining: Math.max(0, target - raised),
    };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {/* Vertical gradient gives the bars depth instead of a flat fill. */}
            <linearGradient id="grad-raise" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--color-data)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="2 5" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `$${v / 1000}K` : `$${v}`)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(63,233,224,0.06)' }}
            contentStyle={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-line)',
              borderRadius: 8,
              boxShadow: '0 12px 34px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: 'var(--color-paper)' }}
            itemStyle={{ color: 'var(--color-mist)' }}
            formatter={(value: unknown, name: unknown) => [
              `$${Number(value).toFixed(2)}`,
              name === 'raised' ? 'Raised' : 'Remaining',
            ]}
          />
          {/* raised fills from the bottom; remaining sits on top — together they
              always reach the target height, giving a fill-meter visual. */}
          <Bar
            dataKey="raised"
            stackId="a"
            fill="url(#grad-raise)"
            radius={[0, 0, 2, 2]}
            animationDuration={900}
          />
          <Bar dataKey="remaining" stackId="a" fill="var(--color-line)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
