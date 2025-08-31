
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { PiggyBank, Landmark, Wallet, CreditCard, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { BalanceSheet } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface AccountData {
  categoryId: string;
  categoryName: string;
  categoryIcon: React.ElementType;
  budget: number;
  spent: number;
  balance: number;
}

interface PaidByData {
    name: string;
    amount: number;
}

export default function BalanceSheetPage() {
  const { 
      categories, filteredTransactions, loading, loadingCategories, selectedMonthName, selectedMonth, selectedYear,
      tenants, selectedTenantId,
      fetchBalanceSheet, saveBalanceSheet,
   } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<BalanceSheet | null>(null);
  const [loadingSavedData, setLoadingSavedData] = useState(true);

  useEffect(() => {
    const loadSavedData = async () => {
        if (!selectedTenantId) return;
        setLoadingSavedData(true);
        const data = await fetchBalanceSheet(selectedYear, selectedMonth);
        setSavedData(data);
        setLoadingSavedData(false);
    };
    loadSavedData();
  }, [selectedYear, selectedMonth, selectedTenantId, fetchBalanceSheet]);
  
  const selectedTenant = useMemo(() => tenants.find(t => t.id === selectedTenantId), [tenants, selectedTenantId]);
  const paidByOptions = useMemo(() => selectedTenant?.paidByOptions || [], [selectedTenant]);

  const { totalBudget, totalSpent, balance, accountData, paidByData } = useMemo(() => {
    if (loading || loadingCategories) return { totalBudget: 0, totalSpent: 0, balance: 0, accountData: [], paidByData: [] };

    const currentTotalBudget = categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
    const currentTotalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    const accounts = categories.map((category): AccountData => {
      const budgetForMonth = category.budget || 0;
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
    
    const paidByTotals = new Map<string, number>();
    paidByOptions.forEach(opt => paidByTotals.set(opt, 0));

    filteredTransactions.forEach(t => {
        if(paidByTotals.has(t.paidBy)) {
            paidByTotals.set(t.paidBy, paidByTotals.get(t.paidBy)! + t.amount);
        }
    });

    const paidBy = Array.from(paidByTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .filter(item => item.amount > 0)
        .sort((a,b) => b.amount - a.amount);

    return { 
        totalBudget: currentTotalBudget, 
        totalSpent: currentTotalSpent, 
        balance: currentTotalBudget - currentTotalSpent,
        accountData: accounts,
        paidByData: paidBy,
    };
  }, [categories, filteredTransactions, loading, loadingCategories, paidByOptions]);

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    try {
        const snapshotData = {
            totalBudget,
            totalSpent,
            balance,
            accountData: accountData.map(({ categoryIcon, ...rest }) => rest), // Remove icon component before saving
            paidByData,
        };
        const savedDoc = await saveBalanceSheet(selectedYear, selectedMonth, snapshotData);
        setSavedData(savedDoc);
        toast({
            title: 'Snapshot Saved',
            description: `Balance sheet for ${selectedMonthName} has been saved.`,
        });
    } catch (error: any) {
        toast({
            title: 'Save Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (loading || loadingCategories || loadingSavedData) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
        </div>
         <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>)}
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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Balance Sheet</h1>
        <p className="text-muted-foreground">Financial overview for {selectedMonthName}.</p>
      </div>

       <div className="grid gap-6 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    <PiggyBank className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Balance</CardTitle>
                    <Landmark className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", balance < 0 ? "text-red-500" : "text-green-500")}>
                        {formatCurrency(balance)}
                    </div>
                </CardContent>
            </Card>
      </div>
      
       {paidByData.length > 0 && (
          <Card>
              <CardHeader>
                  <CardTitle>Spending by Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {paidByData.map(p => (
                      <div key={p.name} className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-muted">
                              <CreditCard className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                              <p className="font-semibold text-lg">{p.name}</p>
                              <p className="text-xl font-bold">{formatCurrency(p.amount)}</p>
                          </div>
                      </div>
                  ))}
              </CardContent>
          </Card>
       )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Category Breakdown</h2>
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
                        isPositive ? 'text-green-500' : 'text-red-500'
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
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No budget or spending activity for categories in {selectedMonthName}.</p>
                </CardContent>
            </Card>
          )}
      </div>

      <Card className="mt-8">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Monthly Snapshot</h3>
                {savedData ? (
                    <p className="text-sm text-muted-foreground">
                        Last saved: {formatDistanceToNow(new Date(savedData.updatedAt), { addSuffix: true })}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No snapshot saved for {selectedMonthName} {selectedYear}.
                    </p>
                )}
              </div>
              <Button onClick={handleSaveSnapshot} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 animate-spin" />}
                  <Save className="mr-2"/>
                  {savedData ? 'Update Snapshot' : 'Save Snapshot'}
              </Button>
          </CardContent>
      </Card>

    </div>
  );
}
