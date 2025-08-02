
'use client';

import { useMemo, useState } from 'react';
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, getDay } from 'date-fns';
import { useApp } from '@/lib/provider';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface CumulativeExpenseChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

export function CumulativeExpenseChart({ transactions, year, month }: CumulativeExpenseChartProps) {
  const { categories } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCumulative, setShowCumulative] = useState(true);

  const chartData = useMemo(() => {
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
    
    return daysInMonth.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dailyTotal = dailyTotals.get(dayKey) || 0;
        cumulativeTotal += dailyTotal;
        return {
            date: format(day, 'EEEEEE'), // 'Su', 'Mo', etc.
            fullDate: day,
            cumulativeTotal,
            dailyTotal,
        };
    });
  }, [transactions, year, month, selectedCategory]);
  
  const sundays = useMemo(() => {
      return chartData
        .filter(d => getDay(d.fullDate) === 0)
        .map(d => ({ key: format(d.fullDate, 'yyyy-MM-dd'), x: d.date }));
  }, [chartData]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-sm">{format(data.fullDate, 'EEEE, d MMM')}</p>
          <p className="text-xs text-muted-foreground">
            {showCumulative ? 'Total Spent:' : 'Daily Spend:'} <span className="font-medium text-foreground">{formatCurrency(showCumulative ? data.cumulativeTotal : data.dailyTotal)}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    
    if (!payload || !payload.value) {
        return null;
    }

    const dataPoint = chartData.find(d => d.date === payload.value);
    if(!dataPoint) return null;
    
    const isWeekend = getDay(dataPoint.fullDate) === 0 || getDay(dataPoint.fullDate) === 6;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill={isWeekend ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'} fontSize={12} transform="rotate(-35)">
                {payload.value}
            </text>
        </g>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
                <CardTitle>{showCumulative ? 'Cumulative Daily Expenses' : 'Daily Expenses'}</CardTitle>
                <CardDescription>{showCumulative ? 'Running total of expenses for the selected month.' : 'Total spend for each day in the selected month.'}</CardDescription>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center space-x-2">
                    <Switch id="cumulative-toggle" checked={showCumulative} onCheckedChange={setShowCumulative} />
                    <Label htmlFor="cumulative-toggle">Cumulative</Label>
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
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
            {showCumulative ? (
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tick={<CustomXAxisTick />} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {sundays.map(sunday => (
                        <ReferenceLine key={sunday.key} x={sunday.x} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    ))}
                    <Line type="monotone" dataKey="cumulativeTotal" name="Cumulative Spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
            ) : (
                <BarChart data={chartData.filter(d => d.dailyTotal > 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tick={<CustomXAxisTick />} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    {sundays.map(sunday => (
                        <ReferenceLine key={sunday.key} x={sunday.x} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    ))}
                    <Bar dataKey="dailyTotal" name="Daily Spend" fill="hsl(var(--primary))" />
                </BarChart>
            )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
