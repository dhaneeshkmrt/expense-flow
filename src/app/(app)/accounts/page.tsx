
'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const dynamic = 'force-dynamic';

interface AccountData {
  categoryId: string;
  categoryName: string;
  categoryIcon: React.ElementType;
  budget: number;
  spent: number;
  balance: number;
}

export default function AccountsPage() {
  const { categories, filteredTransactions, loading, loadingCategories, selectedYear, selectedMonth } = useApp();
  const formatCurrency = useCurrencyFormatter();
  
  const selectedMonthKey = useMemo(() => {
    return format(new Date(selectedYear, selectedMonth), 'yyyy-MM');
  }, [selectedYear, selectedMonth]);

  const accountData = useMemo(() => {
    if (loading || loadingCategories) return [];

    return categories.map((category): AccountData => {
      const budgetForMonth = category.budgets?.[selectedMonthKey] || 0;

      const spentForMonth = filteredTransactions
        .filter(t => t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: typeof category.icon === 'string' ? () => null : category.icon,
        budget: budgetForMonth,
        spent: spentForMonth,
        balance: budgetForMonth - spentForMonth,
      };
    }).filter(account => account.budget > 0 || account.spent > 0);
  }, [categories, filteredTransactions, loading, loadingCategories, selectedMonthKey]);
  
  const selectedMonthName = useMemo(() => {
      return format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
  }, [selectedYear, selectedMonth]);

  if (loading || loadingCategories) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground">Category balances for {selectedMonthName}.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {accountData.map(account => {
          const Icon = account.categoryIcon;
          const isPositive = account.balance >= 0;
          return (
            <Card key={account.categoryId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <CardTitle>{account.categoryName}</CardTitle>
                  </div>
                  <div
                    className={cn(
                      'text-lg font-bold',
                      isPositive ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </div>
                </div>
                <CardDescription>
                  {formatCurrency(account.budget)} (Budget) - {formatCurrency(account.spent)} (Spent)
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
       {accountData.length === 0 && (
          <Card>
              <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No budget or spending activity for categories in {selectedMonthName}.</p>
              </CardContent>
          </Card>
        )}
    </div>
  );
}
