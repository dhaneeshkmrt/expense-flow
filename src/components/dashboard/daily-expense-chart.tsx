
'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Dot, ReferenceLine, CartesianGrid } from 'recharts';
import { useApp } from '@/lib/provider';
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, setDate, isValid, getDay } from 'date-fns';
import type { Transaction } from '@/lib/types';
import DayTransactionsDialog from './day-transactions-dialog';

interface DailyExpenseChartProps {
    transactions: Transaction[];
    year: number;
    month: number;
}

const CustomDot = (props: any) => {
    const { cx, cy, payload, handleDotClick } = props;
  
    if (payload.total > 0) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={4}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth={1}
          onClick={() => handleDotClick(payload)}
          className="cursor-pointer"
        />
      );
    }
  
    return null;
};

export function DailyExpenseChart({ transactions, year, month }: DailyExpenseChartProps) {
  const { settings } = useApp();
  const [selectedDay, setSelectedDay] = useState<{ date: Date | null; transactions: Transaction[] }>({ date: null, transactions: [] });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          name: format(d.date, 'd'), 
          total: d.total,
          date: d.date,
      }))
      .sort((a,b) => a.date.getDate() - b.date.getDate());

  }, [transactions, year, month]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('$', settings.currency);
  };
  
  const handleDotClick = useCallback((payload: any) => {
    if (!payload || !payload.date) return;
    
    const clickedDate = payload.date;
    
    if (!isValid(clickedDate)) return;

    const clickedDateString = format(clickedDate, 'yyyy-MM-dd');
    
    const dayTransactions = transactions.filter(t => format(parseISO(t.date), 'yyyy-MM-dd') === clickedDateString);

    setSelectedDay({ date: clickedDate, transactions: dayTransactions });
    setIsDialogOpen(true);
  }, [transactions]);


  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart 
          data={data} 
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
          <XAxis 
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              padding={{ left: 10, right: 10 }}
          />
          <YAxis 
              stroke="hsl(var(--muted-foreground))"
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
            formatter={(value: number, name, props) => [formatCurrency(value), `Day ${props.payload.name}`]}
            labelFormatter={() => ''}
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={<CustomDot handleDotClick={handleDotClick} />}
            activeDot={(props) => <CustomDot {...props} r={6} />}
          />
        </LineChart>
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
