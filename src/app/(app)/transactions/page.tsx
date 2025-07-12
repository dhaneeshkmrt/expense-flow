'use client';

import { useApp } from '@/lib/provider';
import { columns } from '@/components/transactions/columns';
import { DataTable } from '@/components/transactions/data-table';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function TransactionsPage() {
  const { transactions } = useApp();

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
            <Button>
              <PlusCircle className="mr-2" />
              Add Transaction
            </Button>
        </AddTransactionSheet>
      </div>
      <DataTable columns={columns} data={transactions} />
    </div>
  );
}
