
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo, useState, useCallback } from 'react';
import type { Transaction } from '@/lib/types';
import CategoryTransactionsDialog from './category-transactions-dialog';
import { format } from 'date-fns';

interface OverviewChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

export function OverviewChart({ transactions, year, month }: OverviewChartProps) {
  const { categories, settings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string | null; transactions: Transaction[] }>({ name: null, transactions: [] });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const data = useMemo(() => {
    const monthKey = format(new Date(year, month), 'yyyy-MM');
    const categoryTotals = new Map<string, { total: number, budget: number }>();

    categories.forEach(cat => {
      const budget = cat.budgets?.[monthKey] || 0;
      categoryTotals.set(cat.name, { total: 0, budget });
    });

    transactions.forEach(txn => {
        const currentData = categoryTotals.get(txn.category) || { total: 0, budget: 0 };
        currentData.total += txn.amount;
        categoryTotals.set(txn.category, currentData);
    });

    return Array.from(categoryTotals.entries())
      .map(([name, { total, budget }]) => ({ 
          name, 
          total,
          balance: budget > 0 ? budget - total : null,
      }))
      .filter(item => item.total > 0 || item.balance !== null)
      .sort((a, b) => {
        // Sort by balance ascending (nulls/no-budget go to the end)
        if (a.balance === null && b.balance === null) return b.total - a.total; // if both have no budget, sort by spending
        if (a.balance === null) return 1;
        if (b.balance === null) return -1;
        return a.balance - b.balance;
      });
  }, [transactions, categories, year, month]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('$', settings.currency);
  };

  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    
    const categoryName = data.activePayload[0].payload.name;
    const categoryTransactions = transactions.filter(t => t.category === categoryName);

    setSelectedCategory({ name: categoryName, transactions: categoryTransactions });
    setIsDialogOpen(true);
  }, [transactions]);

  const BalanceLabel = (props: any) => {
    const { x, y, width, value } = props;
    
    if (!props.payload) {
        return null;
    }
    const { balance } = props.payload;

    if (balance === null || balance === undefined) {
      return null;
    }

    const isPositive = balance >= 0;
    const fill = isPositive ? 'hsl(142.1 76.2% 41.2%)' : 'hsl(0 84.2% 60.2%)';

    return (
      <text x={x + width + 5} y={y + 11} fill={fill} textAnchor="start" fontSize={11} fontWeight="bold">
        {formatCurrency(balance)}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            Spent: <span className="font-medium text-foreground">{formatCurrency(data.total)}</span>
          </p>
          {data.balance !== null && (
            <p className="text-xs text-muted-foreground">
              Balance: <span className="font-medium text-foreground">{formatCurrency(data.balance)}</span>
            </p>
          )}
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
            onClick={handleBarClick}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
          >
            <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings.currency}${value}`} />
            <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} tick={{ textAnchor: 'end' }} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} className="cursor-pointer">
                <LabelList dataKey="balance" content={<BalanceLabel />} />
            </Bar>
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
