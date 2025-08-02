
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo, useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types';
import CategoryTransactionsDialog from './category-transactions-dialog';
import { format } from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface OverviewChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

export function OverviewChart({ transactions, year, month }: OverviewChartProps) {
  const { categories } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string | null; transactions: Transaction[]; budget: number, spent: number }>({ name: null, transactions: [], budget: 0, spent: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const data = useMemo(() => {
    const monthKey = format(new Date(year, month), 'yyyy-MM');
    const categoryTotals = new Map<string, { total: number, budget: number }>();

    categories.forEach(cat => {
      const budget = cat.budgets?.[monthKey] || 0;
      // Only include categories with a budget for this view
      if (budget > 0) {
        categoryTotals.set(cat.name, { total: 0, budget });
      }
    });

    transactions.forEach(txn => {
        const currentData = categoryTotals.get(txn.category);
        if (currentData) { // Only track spending for categories with budgets
            currentData.total += txn.amount;
            categoryTotals.set(txn.category, currentData);
        }
    });

    return Array.from(categoryTotals.entries())
      .map(([name, { total, budget }]) => ({ 
          name, 
          spent: total,
          budget,
          percentage: budget > 0 ? Math.min((total / budget) * 100, 100) : 0, // Cap at 100 for the main bar
          overBudget: budget > 0 ? Math.max(((total - budget) / budget) * 100, 0) : 0, // For the "over budget" segment
          totalSpent: total,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [transactions, categories, year, month]);
  
  const handleBarClick = useCallback((data: any) => {
    if (!data) return;
    
    const payload = data;
    const categoryName = payload.name;
    const categoryTransactions = transactions.filter(t => t.category === categoryName);

    setSelectedCategory({
      name: categoryName,
      transactions: categoryTransactions,
      budget: payload.budget,
      spent: payload.totalSpent
    });
    setIsDialogOpen(true);
  }, [transactions]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const balance = data.budget - data.totalSpent;
      const percentage = data.budget > 0 ? Math.round((data.totalSpent / data.budget) * 100) : 0;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            Spent: <span className="font-medium text-foreground">{formatCurrency(data.totalSpent)}</span> / {formatCurrency(data.budget)}
          </p>
           <p className="text-xs text-muted-foreground">
            Usage: <span className="font-medium text-foreground">{percentage}%</span> | Balance: <span className="font-medium text-foreground">{formatCurrency(balance)}</span> 
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data}
            onClick={(state) => {
                if (state.activePayload && state.activePayload.length > 0) {
                    handleBarClick(state.activePayload[0].payload)
                }
            }}
            layout="vertical"
            stackOffset="none"
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis 
                type="number" 
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}%`} 
            />
            <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                width={80} 
                tick={{ textAnchor: 'end' }} 
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="percentage" stackId="a" fill="hsl(var(--primary))" className="cursor-pointer" />
            <Bar dataKey="overBudget" stackId="a" fill="hsl(var(--destructive))" className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      <CategoryTransactionsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryName={selectedCategory.name}
        transactions={selectedCategory.transactions}
        budget={selectedCategory.budget}
        spent={selectedCategory.spent}
      />
    </>
  );
}
