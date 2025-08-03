
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { useApp } from '@/lib/provider';
import { DailyExpenseChart } from '@/components/dashboard/daily-expense-chart';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';
import { MonthlyCategoryChart } from '@/components/dashboard/monthly-category-chart';
import { CumulativeExpenseChart } from '@/components/dashboard/cumulative-expense-chart';

export default function DashboardPage() {
  const { filteredTransactions, selectedYear, selectedMonth } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Here&apos;s a quick overview of your finances.
          </p>
        </div>
      </div>

      <DashboardStats transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />

       <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Expense Overview</CardTitle>
            <CardDescription>Your spending by day for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyExpenseChart transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle>Monthly Category Expenses</CardTitle>
            <CardDescription>Spending vs. budget for each category.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyCategoryChart transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />
          </CardContent>
        </Card>
      </div>
       <div className="grid grid-cols-1">
        <CumulativeExpenseChart transactions={filteredTransactions} year={selectedYear} month={selectedMonth} />
      </div>
      <div className="grid grid-cols-1">
        <CategoryBreakdown transactions={filteredTransactions} />
      </div>
    </div>
  );
}
