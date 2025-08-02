
'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface MonthlyRecord {
  month: string;
  budget: number;
  spent: number;
  balance: number;
}

interface AccountData {
  categoryId: string;
  categoryName: string;
  categoryIcon: React.ElementType;
  totalBudget: number;
  totalSpent: number;
  accumulatedBalance: number;
  monthlyRecords: MonthlyRecord[];
}

export const dynamic = 'force-dynamic';

const EditableBudgetCell = ({ categoryId, month, initialBudget }: { categoryId: string, month: string, initialBudget: number }) => {
    const { updateCategoryBudget } = useApp();
    const formatCurrency = useCurrencyFormatter();
    const [budget, setBudget] = useState(initialBudget);
    const [isEditing, setIsEditing] = useState(false);
    const debouncedBudget = useDebounce(budget, 500);

    const handleSave = () => {
        updateCategoryBudget(categoryId, month, debouncedBudget);
        setIsEditing(false);
    };
    
    return (
        <div className="flex items-center justify-end gap-1">
            {isEditing ? (
                <Input 
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="h-8 text-right w-24"
                    autoFocus
                />
            ) : (
                <>
                    <span>{formatCurrency(budget, { style: 'decimal'})}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-3 w-3" />
                    </Button>
                </>
            )}
        </div>
    )
}


export default function AccountsPage() {
  const { categories, transactions, loading, user, tenants } = useApp();
  const formatCurrency = useCurrencyFormatter();

  const userTenant = useMemo(() => {
    if (!user || !tenants.length) return null;
    return tenants.find(t => t.id === user.tenantId);
  }, [user, tenants]);
  
  const isRootUser = useMemo(() => {
    if (!userTenant || !user) return false;
    return !!userTenant.isRootUser && user.name === userTenant.name;
  }, [user, userTenant]);

  const accountData = useMemo(() => {
    if (loading) return [];

    return categories.map((category): AccountData => {
      const monthlyData: Record<string, { budget: number; spent: number }> = {};

      // Initialize with budgets for months that have them
      if (category.budgets) {
        for (const [monthKey, budget] of Object.entries(category.budgets)) {
          monthlyData[monthKey] = { budget: budget, spent: 0 };
        }
      }

      // Aggregate spending for relevant months
      transactions
        .filter(t => t.category === category.name)
        .forEach(t => {
          const monthKey = format(parseISO(t.date), 'yyyy-MM');
          // Only track spending if a budget exists for that month
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].spent += t.amount;
          }
        });

      let totalBudget = 0;
      let totalSpent = 0;

      const monthlyRecords: MonthlyRecord[] = Object.entries(monthlyData)
        .map(([month, data]) => {
          totalBudget += data.budget;
          totalSpent += data.spent;
          return {
            month,
            budget: data.budget,
            spent: data.spent,
            balance: data.budget - data.spent,
          };
        })
        .sort((a, b) => b.month.localeCompare(a.month));

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: typeof category.icon === 'string' ? () => null : category.icon,
        totalBudget,
        totalSpent,
        accumulatedBalance: totalBudget - totalSpent,
        monthlyRecords,
      };
    });
  }, [categories, transactions, loading]);

  if (loading) {
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
        <p className="text-muted-foreground">Track your category budgets and balances.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {accountData.map(account => {
          const Icon = account.categoryIcon;
          const isPositive = account.accumulatedBalance >= 0;
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
                    {formatCurrency(account.accumulatedBalance)}
                  </div>
                </div>
                <CardDescription>
                  Accumulated Balance: {formatCurrency(account.totalBudget)} (Budget) - {formatCurrency(account.totalSpent)} (Spent)
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
