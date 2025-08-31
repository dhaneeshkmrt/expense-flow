
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { columns } from '@/components/transactions/columns';
import { DataTable } from '@/components/transactions/data-table';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { Import, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ImportCsvDialog from '@/components/transactions/import-csv-dialog';

export const dynamic = 'force-dynamic';

export default function TransactionsPage() {
  const { user, tenants, filteredTransactions, loading, loadingCategories, selectedTenantId } = useApp();

  const isMainTenantUser = useMemo(() => {
    if (!user || !tenants.length) return false;
    const userTenant = tenants.find(t => t.id === user.tenantId);
    return !!userTenant && user.name === userTenant.name;
  }, [user, tenants]);


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
        <div className="flex items-center gap-2">
          {isMainTenantUser && (
            <ImportCsvDialog>
              <Button variant="outline" disabled={!selectedTenantId}>
                <Import className="mr-2" />
                Import CSV
              </Button>
            </ImportCsvDialog>
          )}
          <AddTransactionSheet>
              <Button disabled={!selectedTenantId}>
                <PlusCircle className="mr-2" />
                Add Transaction
              </Button>
          </AddTransactionSheet>
        </div>
      </div>
      <DataTable columns={columns} data={filteredTransactions} showFilters={true} />
    </div>
  );
}
