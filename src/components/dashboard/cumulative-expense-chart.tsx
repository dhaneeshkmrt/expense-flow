
'use client';

import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceArea } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, isSaturday, isSunday } from 'date-fns';
import { useApp } from '@/lib/provider';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface CumulativeExpenseChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const { fullDate, dateLabel } = payload.value;
    const isWeekend = isSaturday(fullDate) || isSunday(fullDate);

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill={isWeekend ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"} transform="rotate(-35)">
                {dateLabel}
            </text>
        </g>
    );
};


export function CumulativeExpenseChart({ transactions, year, month }: CumulativeExpenseChartProps) {
  const { categories } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { chartData, weekendAreas } = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let cumulativeTotal = 0;
    const filteredTxns = selectedCategory === 'all'
      ? transactions
      : transactions.filter(t => t.category === selectedCategory);

    const dailyTotals = new Map<string, number>();
    filteredTxns.forEach(txn => {
        const dayKey = format(parseISO(txn.date), 'yyyy-MM-dd');
        dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + txn.amount);
    });
    
    const chartDataResult = daysInMonth.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        cumulativeTotal += dailyTotals.get(dayKey) || 0;
        return {
            dateLabel: format(day, 'd'),
            dayOfWeek: format(day, 'EEEE'),
            fullDate: day,
            cumulativeTotal,
        };
    });

    const weekendAreasResult: { x1: string, x2: string }[] = [];
    daysInMonth.forEach(day => {
        if (isSaturday(day) || isSunday(day)) {
            const dateLabel = format(day, 'd');
            weekendAreasResult.push({ x1: dateLabel, x2: dateLabel });
        }
    });

    return { chartData: chartDataResult, weekendAreas: weekendAreasResult };
  }, [transactions, year, month, selectedCategory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-sm">Day {data.dateLabel} ({data.dayOfWeek})</p>
          <p className="text-xs text-muted-foreground">
            Total Spent: <span className="font-medium text-foreground">{formatCurrency(data.cumulativeTotal)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Cumulative Daily Expenses</CardTitle>
                <CardDescription>Running total of expenses for the selected month.</CardDescription>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                dataKey="dateLabel" 
                type="category" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tick={<CustomizedAxisTick />} 
                interval={0}
                // Pass the necessary data to the tick renderer
                ticks={chartData.map(d => ({ value: d.dateLabel, fullDate: d.fullDate, dateLabel: d.dateLabel }))}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {weekendAreas.map((area, index) => (
              <ReferenceArea key={index} x1={area.x1} x2={area.x2} strokeOpacity={0.1} fill="hsl(var(--muted))" fillOpacity={0.2} />
            ))}
            <Line type="monotone" dataKey="cumulativeTotal" name="Cumulative Spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
