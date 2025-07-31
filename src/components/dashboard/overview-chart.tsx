
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList, Cell } from 'recharts';
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
          total,
          budget,
          percentage: budget > 0 ? Math.round((total / budget) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [transactions, categories, year, month]);
  
  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    
    const payload = data.activePayload[0].payload;
    const categoryName = payload.name;
    const categoryTransactions = transactions.filter(t => t.category === categoryName);

    setSelectedCategory({
      name: categoryName,
      transactions: categoryTransactions,
      budget: payload.budget,
      spent: payload.total
    });
    setIsDialogOpen(true);
  }, [transactions]);

  const CustomLabel = (props: any) => {
    const { x, y, width, height, payload } = props;

    if (!payload) {
      return null;
    }
  
    const { budget, total, percentage } = payload;
  
    if (budget === undefined || total === undefined) {
      return null;
    }
    const balance = budget - total;
  
    if (width < 50) {
      return null;
    }
  
    const labelText = `${percentage}% | ${formatCurrency(balance)}`;
  
    return (
      <text
        x={x + width - 10}
        y={y + height / 2}
        dy={4}
        fill="#fff"
        textAnchor="end"
        fontSize={12}
        fontWeight="bold"
      >
        {labelText}
      </text>
    );
  };
  
  const maxPercentage = useMemo(() => {
    if (data.length === 0) return 100;
    const max = Math.max(...data.map(d => d.percentage));
    return max < 100 ? 100 : max;
  }, [data]);

  return (
    <>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data}
            onClick={handleBarClick}
            layout="vertical"
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis 
                type="number" 
                domain={[0, maxPercentage]}
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}%`} 
            />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} tick={{ textAnchor: 'end' }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-bold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        Spent: <span className="font-medium text-foreground">{formatCurrency(data.total)}</span> / {formatCurrency(data.budget)}
                      </p>
                       <p className="text-xs text-muted-foreground">
                        Usage: <span className="font-medium text-foreground">{data.percentage}%</span> | Balance: <span className="font-medium text-foreground">{formatCurrency( data.budget - data.total)}</span> 
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} className="cursor-pointer">
                <LabelList dataKey="percentage" content={<CustomLabel />} />
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage > 100 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                ))}
            </Bar>
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

