'use client';

import { useApp } from '@/lib/provider';
import { columns } from '@/components/transactions/columns';
import { DataTable } from '@/components/transactions/data-table';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsPage() {
  const { transactions, loading, loadingCategories, selectedTenantId } = useApp();

  if (loading || loadingCategories) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all your transactions.
          </p>
        </div>
        <AddTransactionSheet>
            <Button disabled={!selectedTenantId}>
              <PlusCircle className="mr-2" />
              Add Transaction
            </Button>
        </AddTransactionSheet>
      </div>
      <DataTable columns={columns} data={transactions} showFilters={true} />
    </div>
  );
}
