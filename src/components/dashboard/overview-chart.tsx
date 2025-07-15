
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo, useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types';
import CategoryTransactionsDialog from './category-transactions-dialog';

interface OverviewChartProps {
  transactions: Transaction[];
}

export function OverviewChart({ transactions }: OverviewChartProps) {
  const { categories, settings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string | null; transactions: Transaction[] }>({ name: null, transactions: [] });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    
    const categoryName = data.activePayload[0].payload.name;
    const categoryTransactions = transactions.filter(t => t.category === categoryName);

    setSelectedCategory({ name: categoryName, transactions: categoryTransactions });
    setIsDialogOpen(true);
  }, [transactions]);

  return (
    <>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data}
            onClick={handleBarClick}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings.currency}${value}`} />
            <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} tick={{ textAnchor: 'end' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              cursor={{ fill: 'hsl(var(--muted))' }}
              formatter={(value: number) => [`${settings.currency}${value.toFixed(2)}`, 'Total']}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      <CategoryTransactionsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryName={selectedCategory.name}
        transactions={selectedCategory.transactions}
      />
    </>
  );
}
