
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo, useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types';
import CategoryTransactionsDialog from './category-transactions-dialog';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface OverviewChartProps {
  transactions: Transaction[];
}

type SortOption = 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc';

export function OverviewChart({ transactions }: OverviewChartProps) {
  const { categories, settings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string | null; transactions: Transaction[] }>({ name: null, transactions: [] });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('amount-desc');

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
      .sort((a, b) => {
        const [key, order] = sortOption.split('-') as ['amount' | 'name', 'asc' | 'desc'];
        if (key === 'amount') {
          return order === 'desc' ? b.total - a.total : a.total - b.total;
        } else { // name
          return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
      });
  }, [transactions, categories, sortOption]);

  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    
    const categoryName = data.activePayload[0].payload.name;
    const categoryTransactions = transactions.filter(t => t.category === categoryName);

    setSelectedCategory({ name: categoryName, transactions: categoryTransactions });
    setIsDialogOpen(true);
  }, [transactions]);

  return (
    <>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Category Expense Overview</CardTitle>
            <CardDescription>Your spending by category for the selected period.</CardDescription>
          </div>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px] mt-2 sm:mt-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
      <CategoryTransactionsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryName={selectedCategory.name}
        transactions={selectedCategory.transactions}
      />
    </>
  );
}
