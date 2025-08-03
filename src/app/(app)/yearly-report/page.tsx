
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export default function YearlyReportPage() {
  const { categories, transactions, loading, loadingCategories, selectedYear } = useApp();
  const formatCurrency = useCurrencyFormatter();
  
  const monthHeaders = Array.from({ length: 12 }, (_, i) => format(new Date(selectedYear, i), 'MMM'));

  const reportData = useMemo(() => {
    if (loading || loadingCategories) return [];

    const yearTransactions = transactions.filter(t => getYear(parseISO(t.date)) === selectedYear);

    return categories.map(category => {
      const monthlyData = Array(12).fill(null).map((_, monthIndex) => {
        const monthKey = format(new Date(selectedYear, monthIndex), 'yyyy-MM');
        const budget = category.budgets?.[monthKey] || 0;

        const spent = yearTransactions
          .filter(t => t.category === category.name && getMonth(parseISO(t.date)) === monthIndex)
          .reduce((sum, t) => sum + t.amount, 0);

        const balance = budget - spent;
        return { budget, spent, balance };
      });

      const totalBudget = monthlyData.reduce((sum, data) => sum + data.budget, 0);
      const totalSpent = monthlyData.reduce((sum, data) => sum + data.spent, 0);
      const totalBalance = totalBudget - totalSpent;

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: typeof category.icon === 'string' ? () => null : category.icon,
        monthlyData,
        totalBudget,
        totalSpent,
        totalBalance,
      };
    }).filter(row => row.totalBudget > 0 || row.totalSpent > 0);
  }, [categories, transactions, selectedYear, loading, loadingCategories]);
  
  const grandTotals = useMemo(() => {
      const totals = {
          monthly: Array(12).fill(null).map(() => ({ budget: 0, spent: 0, balance: 0 })),
          totalBudget: 0,
          totalSpent: 0,
          totalBalance: 0,
      };

      reportData.forEach(row => {
          row.monthlyData.forEach((monthData, index) => {
              totals.monthly[index].budget += monthData.budget;
              totals.monthly[index].spent += monthData.spent;
              totals.monthly[index].balance += monthData.balance;
          });
          totals.totalBudget += row.totalBudget;
          totals.totalSpent += row.totalSpent;
          totals.totalBalance += row.totalBalance;
      });

      return totals;
  }, [reportData]);

  if (loading || loadingCategories) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                <Skeleton className="h-96 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yearly Report</h1>
        <p className="text-muted-foreground">Category snapshot for {selectedYear}.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
            <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 bg-card z-10">Category</TableHead>
                {monthHeaders.map(month => (
                  <TableHead key={month} className="text-center">{month}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map(row => {
                const Icon = row.categoryIcon;
                return (
                  <TableRow key={row.categoryId}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                           <Icon className="w-4 h-4 text-primary" />
                           <span>{row.categoryName}</span>
                        </div>
                    </TableCell>
                    {row.monthlyData.map((data, index) => (
                      <TableCell key={index} className="text-center">
                        <div className={cn('text-xs', data.balance < 0 ? 'text-red-600' : 'text-green-600')}>
                          {formatCurrency(data.balance, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(data.spent, { maximumFractionDigits: 0 })} / {formatCurrency(data.budget, { maximumFractionDigits: 0 })}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                       <div className={cn('text-sm font-bold', row.totalBalance < 0 ? 'text-red-600' : 'text-green-600')}>
                          {formatCurrency(row.totalBalance)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(row.totalSpent)} / {formatCurrency(row.totalBudget)}
                        </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell className="sticky left-0 bg-muted/50 z-10">Grand Total</TableCell>
                    {grandTotals.monthly.map((total, index) => (
                        <TableCell key={index} className="text-center">
                            <div className={cn('text-sm', total.balance < 0 ? 'text-red-600' : 'text-green-600')}>
                                {formatCurrency(total.balance)}
                            </div>
                            <div className="text-xs text-muted-foreground font-normal">
                                {formatCurrency(total.spent)} / {formatCurrency(total.budget)}
                            </div>
                        </TableCell>
                    ))}
                    <TableCell className="text-right">
                        <div className={cn('text-lg', grandTotals.totalBalance < 0 ? 'text-red-600' : 'text-green-600')}>
                            {formatCurrency(grandTotals.totalBalance)}
                        </div>
                        <div className="text-sm text-muted-foreground font-normal">
                            {formatCurrency(grandTotals.totalSpent)} / {formatCurrency(grandTotals.totalBudget)}
                        </div>
                    </TableCell>
                </TableRow>
            </TableFooter>
          </Table>
          </div>
           {reportData.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                    <p>No budget or spending activity for categories in {selectedYear}.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
