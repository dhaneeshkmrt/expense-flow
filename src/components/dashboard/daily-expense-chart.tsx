'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, getDate, parseISO } from 'date-fns';

export function DailyExpenseChart() {
  const { transactions, settings } = useApp();

  const data = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    const daysInMonth = eachDayOfInterval({
        start: monthStart,
        end: monthEnd
    });

    const dailyTotals = new Map<string, number>();
    daysInMonth.forEach(day => {
        dailyTotals.set(format(day, 'yyyy-MM-dd'), 0);
    })

    transactions.forEach(txn => {
        const transactionDate = parseISO(txn.date);
        if (isWithinInterval(transactionDate, { start: monthStart, end: monthEnd })) {
            const dayKey = format(transactionDate, 'yyyy-MM-dd');
            const currentTotal = dailyTotals.get(dayKey) || 0;
            dailyTotals.set(dayKey, currentTotal + txn.amount);
        }
    });

    return Array.from(dailyTotals.entries())
      .map(([date, total]) => ({ 
          name: format(parseISO(date), 'd'), 
          total 
      }))
      .sort((a,b) => parseInt(a.name) - parseInt(b.name));

  }, [transactions]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis 
            dataKey="name" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#888888' }} 
        />
        <YAxis 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${settings.currency}${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          cursor={{ fill: 'hsl(var(--muted))' }}
          formatter={(value: number, name, props) => [`${settings.currency}${value.toFixed(2)}`, `Day ${props.payload.name}`]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
