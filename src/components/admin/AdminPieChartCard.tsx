'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Locale } from '@/lib/locale';

export type AdminPieSlice = {
  label: string;
  value: number;
  color: string;
};

export default function AdminPieChartCard({
  title,
  slices,
  locale,
}: {
  title: string;
  slices: AdminPieSlice[];
  locale: Locale;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = total > 0 ? slices : slices.map((slice) => ({ ...slice, value: 1 }));

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-[200px_1fr] lg:items-center">
        <div className="relative h-[200px] w-[200px] justify-self-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {locale === 'ar' ? 'الإجمالي' : 'Total'}
            </span>
            <span className="text-base font-bold text-zinc-900 dark:text-white">{total}</span>
          </div>
        </div>

        <div className="space-y-2">
          {slices.map((slice) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <div key={slice.label} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{slice.label}</span>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{slice.value}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
