'use client';

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { PiggyBank, Landmark, Wallet, CreditCard, Save, Loader2, Shuffle, Eye, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { BalanceSheet, Category } from '@/lib/types';
import CategoryTransferDialog from '@/components/categories/category-transfer-dialog';
import CategoryTransactionsDialog from '@/components/dashboard/category-transactions-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';

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
      processMonthEnd, isMonthLocked, unlockMonth, loadingProcessing, user
   } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<BalanceSheet | null>(null);
  const [loadingSavedData, setLoadingSavedData] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedCategoryForTransfer, setSelectedCategoryForTransfer] = useState<Category | null>(null);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  const [selectedCategoryForTransactions, setSelectedCategoryForTransactions] = useState<string | null>(null);
  const [selectedCategoryTransactions, setSelectedCategoryTransactions] = useState<any[]>([]);
  const [selectedCategoryBudget, setSelectedCategoryBudget] = useState(0);
  
  // Month-end processing state
  const isCurrentMonthLocked = isMonthLocked(selectedYear, selectedMonth);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedCategorySpent, setSelectedCategorySpent] = useState(0);


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

  const handleOpenTransferDialog = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category) {
        setSelectedCategoryForTransfer(category);
        setTransferDialogOpen(true);
    }
  };

  const handleOpenTransactionsDialog = (categoryName: string, budget: number, spent: number) => {
    const categoryTransactions = filteredTransactions.filter(t => t.category === categoryName);
    setSelectedCategoryForTransactions(categoryName);
    setSelectedCategoryTransactions(categoryTransactions);
    setSelectedCategoryBudget(budget);
    setSelectedCategorySpent(spent);
    setTransactionsDialogOpen(true);
  };

  const handleProcessMonthEnd = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User information not available',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await processMonthEnd(selectedYear, selectedMonth, user.name);
      
      toast({
        title: 'Month-End Processing Complete',
        description: `Successfully processed ${result.processedCategories.length} categories with ${formatCurrency(result.totalSurplus)} total surplus transferred to virtual accounts. ${result.accountsCreated} new accounts created.`,
      });

      setProcessDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnlockMonth = async () => {
    try {
      await unlockMonth(selectedYear, selectedMonth);
      
      toast({
        title: 'Month Unlocked',
        description: `${selectedMonthName} ${selectedYear} has been unlocked for processing.`,
      });
    } catch (error: any) {
      toast({
        title: 'Unlock Failed',
        description: error.message,
        variant: 'destructive',
      });
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
    <>
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Balance Sheet</h1>
        <p className="text-muted-foreground">Financial overview for {selectedMonthName}.</p>
      </div>

       <div className="grid gap-6 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    <PiggyBank className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalBudget)}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalSpent)}</div>
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
                              <p className="text-xl font-bold text-primary">{formatCurrency(p.amount)}</p>
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
                    <div className="mb-2">
                        {formatCurrency(account.budget)} (Budget) - {formatCurrency(account.spent)} (Spent)
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenTransactionsDialog(account.categoryName, account.budget, account.spent)}
                        >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                        </Button>
                        {!isPositive && (
                            <Button variant="outline" size="sm" onClick={() => handleOpenTransferDialog(account.categoryName)}>
                                <Shuffle className="mr-1 h-3 w-3" />
                                Transfer
                            </Button>
                        )}
                    </div>
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
              <div className="flex gap-2">
                <Button onClick={handleSaveSnapshot} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    <Save className="mr-2"/>
                    {savedData ? 'Update Snapshot' : 'Save Snapshot'}
                </Button>
                
                {isCurrentMonthLocked ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Month Locked
                    </Button>
                    <Button variant="outline" onClick={handleUnlockMonth}>
                      Unlock Month
                    </Button>
                  </div>
                ) : (
                  <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={loadingProcessing}>
                        {loadingProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Process Month-End
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Process Month-End for {selectedMonthName} {selectedYear}</DialogTitle>
                        <DialogDescription>
                          This will transfer budget surpluses to virtual accounts and lock the month from further changes.
                          This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium mb-2">What will happen:</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Calculate surplus for each category (Budget - Spent)</li>
                            <li>• Create virtual accounts for categories with surplus</li>
                            <li>• Transfer surplus amounts to respective virtual accounts</li>
                            <li>• Lock the month to prevent further transactions</li>
                          </ul>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Categories with surplus will have their extra budget moved to virtual savings accounts.
                          You can view and monitor these accounts in the Virtual Accounts page.
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setProcessDialogOpen(false)}
                          disabled={loadingProcessing}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleProcessMonthEnd} 
                          disabled={loadingProcessing}
                        >
                          {loadingProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Process Month-End
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
          </CardContent>
      </Card>
    </div>
    {selectedCategoryForTransfer && (
        <CategoryTransferDialog 
            open={transferDialogOpen}
            setOpen={setTransferDialogOpen}
            destinationCategory={selectedCategoryForTransfer}
            allCategories={categories}
            filteredTransactions={filteredTransactions}
        />
    )}
    
    <CategoryTransactionsDialog
        open={transactionsDialogOpen}
        onOpenChange={setTransactionsDialogOpen}
        categoryName={selectedCategoryForTransactions}
        transactions={selectedCategoryTransactions}
        budget={selectedCategoryBudget}
        spent={selectedCategorySpent}
    />
    </>
  );
}
