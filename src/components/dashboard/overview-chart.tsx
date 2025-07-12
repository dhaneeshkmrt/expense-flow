'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo } from 'react';

export function OverviewChart() {
  const { transactions, categories } = useApp();

  const data = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    categories.forEach(cat => categoryTotals.set(cat.name, 0));

    transactions.forEach(txn => {
      const currentTotal = categoryTotals.get(txn.category) || 0;
      categoryTotals.set(txn.category, currentTotal + txn.amount);
    });

    return Array.from(categoryTotals.entries())
      .map(([name, total]) => ({ name, total }))
      .filter(item => item.total > 0)
      .sort((a,b) => b.total - a.total);
  }, [transactions, categories]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          cursor={{ fill: 'hsl(var(--muted))' }}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
