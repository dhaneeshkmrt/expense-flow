
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList, ReferenceLine } from 'recharts';
import { useApp } from '@/lib/provider';
import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import type { Transaction } from '@/lib/types';

interface DailyExpenseChartProps {
    transactions: Transaction[];
    year: number;
    month: number;
}

export function DailyExpenseChart({ transactions, year, month }: DailyExpenseChartProps) {
  const { settings } = useApp();

  const { data, yAxisMax, outlierThreshold } = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    
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
        const dayKey = format(transactionDate, 'yyyy-MM-dd');
        const currentTotal = dailyTotals.get(dayKey) || 0;
        dailyTotals.set(dayKey, currentTotal + txn.amount);
    });
    
    const allTotals = Array.from(dailyTotals.values()).filter(total => total > 0);
    
    let yAxisMax = Math.max(...allTotals, 100); // Default max, at least 100
    let outlierThreshold = yAxisMax;
    
    if(allTotals.length > 1) {
        allTotals.sort((a,b) => a - b);
        const percentileIndex = Math.floor(allTotals.length * 0.95);
        const ninetyFifthPercentile = allTotals[percentileIndex];
        
        yAxisMax = ninetyFifthPercentile * 1.2; // Add 20% padding
        outlierThreshold = yAxisMax;
    }


    const chartData = Array.from(dailyTotals.entries())
      .map(([date, total]) => ({ 
          name: format(parseISO(date), 'd'), 
          total 
      }))
      .sort((a,b) => parseInt(a.name) - parseInt(b.name));

    return { data: chartData, yAxisMax, outlierThreshold };

  }, [transactions, year, month]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('$', settings.currency);
  };


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
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
            domain={[0, yAxisMax]}
            allowDataOverflow={true}
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
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
            <LabelList 
                dataKey="total" 
                position="top" 
                formatter={(value: number) => (value > 0 && value < outlierThreshold) ? formatCurrency(value) : ''}
                fontSize={11}
            />
        </Bar>
         {data.map((entry, index) => {
            if (entry.total > outlierThreshold) {
                return (
                    <ReferenceLine 
                        key={`outlier-${index}`}
                        x={entry.name}
                        strokeDasharray="3 3"
                        stroke="hsl(var(--muted-foreground))"
                        label={{ 
                            position: 'top', 
                            value: formatCurrency(entry.total), 
                            fill: 'hsl(var(--foreground))',
                            fontSize: 12
                        }}
                    />
                )
            }
            return null;
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
