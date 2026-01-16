
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { createColumns } from '@/components/transactions/columns';
import { DataTable } from '@/components/transactions/data-table';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { Import, PlusCircle, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ImportCsvDialog from '@/components/transactions/import-csv-dialog';
import type { Transaction } from '@/lib/types';
import Papa from 'papaparse';
import { format, parseISO, startOfMonth } from 'date-fns';

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, 'label': 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
];

export const dynamic = 'force-dynamic';

export default function TransactionsPage() {
  const { 
    user, 
    tenants, 
    transactions, 
    loading, 
    loadingCategories, 
    selectedTenantId, 
    isMonthLocked, 
    filteredTransactions,
    categories,
    selectedYear,
    selectedMonth
  } = useApp();

  const isMainTenantUser = useMemo(() => {
    if (!user || !tenants.length) return false;
    const userTenant = tenants.find(t => t.id === user.tenantId);
    return !!userTenant && user.name === userTenant.name;
  }, [user, tenants]);

  const columns = useMemo(() => createColumns(isMonthLocked), [isMonthLocked]);

  const handleDownloadCsv = () => {
    const selectedTenant = tenants.find(t => t.id === selectedTenantId);
    const firstPaidBy = selectedTenant?.paidByOptions?.[0] || '';
    
    const budgetData = categories
        .map(cat => ({
            name: cat.name,
            budget: cat.budget || 0
        }))
        .filter(cat => cat.budget > 0)
        .map(cat => ({
            'Date': format(startOfMonth(new Date(selectedYear, selectedMonth)), 'd-MMM-yy'),
            'Cate': 'Income',
            'sub': cat.name,
            'Amount': cat.budget.toFixed(2),
            'Paid by': firstPaidBy,
            'Desc': '',
            'Notes': '',
            '': '',
            ' ': '',
        }));

    const transactionData = filteredTransactions.map(t => ({
      'Date': format(parseISO(t.date), 'd-MMM-yy'),
      'Cate': t.category,
      'sub': t.subcategory,
      'Amount': t.amount.toFixed(2),
      'Paid by': t.paidBy,
      'Desc': t.description,
      'Notes': t.notes || '',
      '': '',
      ' ': '',
    }));
    
    const dataToExport = [...budgetData, ...transactionData];

    if (dataToExport.length === 0) return;

    const csv = Papa.unparse(dataToExport, { header: false });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions-${monthName}-${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


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
          <Button onClick={handleDownloadCsv} variant="outline" disabled={filteredTransactions.length === 0 && !categories.some(c => c.budget)}>
            <Download className="mr-2" />
            Download CSV
          </Button>
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
      <DataTable columns={columns} data={filteredTransactions as (Transaction & {id: string, date: string, amount: number})[]} showFilters={true} />
    </div>
  );
}

    

