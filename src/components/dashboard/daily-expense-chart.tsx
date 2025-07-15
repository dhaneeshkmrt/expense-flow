
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList, ReferenceLine } from 'recharts';
import { useApp } from '@/lib/provider';
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, setDate, isValid } from 'date-fns';
import type { Transaction } from '@/lib/types';
import DayTransactionsDialog from './day-transactions-dialog';

interface DailyExpenseChartProps {
    transactions: Transaction[];
    year: number;
    month: number;
}

export function DailyExpenseChart({ transactions, year, month }: DailyExpenseChartProps) {
  const { settings } = useApp();
  const [selectedDay, setSelectedDay] = useState<{ date: Date | null; transactions: Transaction[] }>({ date: null, transactions: [] });
  [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, xAxisMax, outlierThreshold } = useMemo(() => {
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
    
    let xAxisMax = 100; // Default max, at least 100
    let outlierThreshold = xAxisMax;
    
    if(allTotals.length > 0) {
        allTotals.sort((a,b) => a - b);
        const percentileIndex = Math.floor(allTotals.length * 0.95);
        const ninetyFifthPercentile = allTotals[percentileIndex];
        
        xAxisMax = Math.max(ninetyFifthPercentile * 1.2, 100); // Add 20% padding, but ensure it's at least 100
        outlierThreshold = xAxisMax;
    }


    const chartData = Array.from(dailyTotals.entries())
      .map(([date, total]) => ({ 
          name: format(parseISO(date), 'd'), 
          total 
      }))
      .sort((a,b) => parseInt(a.name) - parseInt(b.name));

    return { data: chartData, xAxisMax, outlierThreshold };

  }, [transactions, year, month]);

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
    
    const dayOfMonth = parseInt(data.activePayload[0].payload.name, 10);
    const clickedDate = setDate(new Date(year, month), dayOfMonth);
    
    if (!isValid(clickedDate)) return;

    const clickedDateString = format(clickedDate, 'yyyy-MM-dd');
    
    const dayTransactions = transactions.filter(t => format(parseISO(t.date), 'yyyy-MM-dd') === clickedDateString);

    setSelectedDay({ date: clickedDate, transactions: dayTransactions });
    setIsDialogOpen(true);
  }, [year, month, transactions]);


  return (
    <>
      <ResponsiveContainer width="100%" height={600}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
          onClick={handleBarClick}
        >
          <XAxis 
              type="number"
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `${settings.currency}${value}`}
              domain={[0, xAxisMax]}
              allowDataOverflow={true}
          />
          <YAxis 
              type="category"
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              width={20}
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
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} className="cursor-pointer">
              <LabelList 
                  dataKey="total" 
                  position="right" 
                  formatter={(value: number) => (value > 0 && value < outlierThreshold) ? formatCurrency(value) : ''}
                  fontSize={11}
                  offset={5}
              />
          </Bar>
           {data.map((entry, index) => {
              if (entry.total > outlierThreshold) {
                  return (
                      <ReferenceLine 
                          key={`outlier-${index}`}
                          y={entry.name}
                          strokeDasharray="3 3"
                          stroke="hsl(var(--muted-foreground))"
                          label={{ 
                              position: 'right', 
                              value: formatCurrency(entry.total), 
                              fill: 'hsl(var(--foreground))',
                              fontSize: 12,
                              offset: 10
                          }}
                      />
                  )
              }
              return null;
          })}
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
