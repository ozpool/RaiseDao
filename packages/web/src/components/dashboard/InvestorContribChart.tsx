'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ContribRow } from '@/lib/api';
import { toUSDCNum } from '@/lib/format';

/** Bar chart: total contributed per campaign (signal blue — reads as "my
 *  investment" to contrast the founder's cyan raise-progress chart). Multiple
 *  contributions to the same campaign are summed into one bar. */
export function InvestorContribChart({ contributions }: { contributions: ContribRow[] }) {
  const byId = new Map<number, { name: string; amount: number }>();
  for (const c of contributions) {
    const existing = byId.get(c.campaignId);
    const amt = toUSDCNum(c.amount);
    if (existing) {
      existing.amount += amt;
    } else {
      byId.set(c.campaignId, {
        name: c.title.length > 14 ? `${c.title.slice(0, 14)}…` : c.title,
        amount: amt,
      });
    }
  }
  const data = Array.from(byId.values());

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-contrib" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0.35} />
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
            cursor={{ fill: 'rgba(79,124,255,0.07)' }}
            contentStyle={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-line)',
              borderRadius: 8,
              boxShadow: '0 12px 34px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: 'var(--color-paper)' }}
            itemStyle={{ color: 'var(--color-mist)' }}
            formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, 'Contributed']}
          />
          <Bar
            dataKey="amount"
            fill="url(#grad-contrib)"
            radius={[4, 4, 0, 0]}
            animationDuration={900}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
