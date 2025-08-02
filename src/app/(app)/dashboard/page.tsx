
'use client';
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { useApp } from '@/lib/provider';
import { DailyExpenseChart } from '@/components/dashboard/daily-expense-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, parseISO, format } from 'date-fns';
import Papa from 'papaparse';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';

export const dynamic = 'force-dynamic';

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
];

export default function DashboardPage() {
  const { selectedTenantId, transactions } = useApp();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => getYear(parseISO(t.date))));
    if (!years.has(new Date().getFullYear())) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return getYear(transactionDate) === selectedYear && getMonth(transactionDate) === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth]);
  
  const handleDownloadCsv = () => {
    if (!filteredTransactions.length) return;

    const dataToExport = filteredTransactions.map(t => ({
      'Date': format(parseISO(t.date), 'dd-MMM-yy'),
      'Cate': t.category,
      'sub': t.subcategory,
      'Amount': t.amount.toFixed(2),
      'Paid by': t.paidBy,
      'Desc': t.description,
      'Notes': t.notes || '',
      '': '',
      ' ': '',
    }));

    const csv = Papa.unparse(dataToExport);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Here&apos;s a quick overview of your finances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button onClick={handleDownloadCsv} variant="outline" disabled={filteredTransactions.length === 0}>
            <Download className="mr-2" />
            Download
          </Button>
          <AddTransactionSheet>
            <Button disabled={!selectedTenantId}>
              <PlusCircle className="mr-2" />
              Add Transaction
            </Button>
          </AddTransactionSheet>
        </div>
      </div>

      <DashboardStats transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Daily Expense Overview</CardTitle>
            <CardDescription>Your spending by day for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyExpenseChart transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1">
        <CategoryBreakdown transactions={filteredTransactions} />
      </div>
    </div>
  );
}
