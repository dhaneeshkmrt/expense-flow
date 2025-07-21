
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isValid } from 'date-fns';
import type { Transaction } from '@/lib/types';
import DayTransactionsDialog from './day-transactions-dialog';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface DailyExpenseChartProps {
    transactions: Transaction[];
    year: number;
    month: number;
}

export function DailyExpenseChart({ transactions, year, month }: DailyExpenseChartProps) {
  const formatCurrency = useCurrencyFormatter();
  const [selectedDay, setSelectedDay] = useState<{ date: Date | null; transactions: Transaction[] }>({ date: null, transactions: [] });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    
    const payload = data.activePayload[0].payload;
    if (!payload || !payload.date) return;
    
    const clickedDate = payload.date;
    if (!isValid(clickedDate)) return;

    const clickedDateString = format(clickedDate, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => format(parseISO(t.date), 'yyyy-MM-dd') === clickedDateString);

    setSelectedDay({ date: clickedDate, transactions: dayTransactions });
    setIsDialogOpen(true);
  }, [transactions]);


  const data = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    
    const daysInMonth = eachDayOfInterval({
        start: monthStart,
        end: monthEnd
    });

    const dailyData = new Map<string, { total: number; date: Date }>();
    daysInMonth.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        dailyData.set(dayKey, { total: 0, date: day });
    })

    transactions.forEach(txn => {
        const transactionDate = parseISO(txn.date);
        const dayKey = format(transactionDate, 'yyyy-MM-dd');
        const currentData = dailyData.get(dayKey);
        if (currentData) {
            currentData.total += txn.amount;
        }
    });

    return Array.from(dailyData.values())
      .map(d => ({ 
          name: format(d.date, 'd MMM'), 
          total: d.total,
          date: d.date,
      }))
      .filter(d => d.total > 0)
      .sort((a,b) => a.date.getDate() - b.date.getDate());

  }, [transactions, year, month]);

  const TotalLabel = (props: any) => {
    const { x, y, width, value } = props;
    
    if (value === null || value === undefined || value === 0) {
      return null;
    }

    return (
      <text x={x + width + 5} y={y + 11} fill="hsl(var(--foreground))" textAnchor="start" fontSize={11} fontWeight="bold">
        {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
        </div>
      );
    }
    return null;
  };


  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={data}
          onClick={handleBarClick}
          layout="vertical"
          margin={{ top: 5, right: 60, left: -10, bottom: 5 }}
        >
          <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}
          />
          <YAxis 
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              width={60}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} className="cursor-pointer">
            <LabelList dataKey="total" content={<TotalLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DayTransactionsDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        date={selectedDay.date}
        transactions={selectedDay.transactions}
      />
    </>
  );
}
