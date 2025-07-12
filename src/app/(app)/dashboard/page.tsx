import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import AddTransactionSheet from '@/components/transactions/add-transaction-sheet';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Here&apos;s a quick overview of your finances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2" />
            Download Report
          </Button>
          <AddTransactionSheet>
            <Button>
              <PlusCircle className="mr-2" />
              Add Transaction
            </Button>
          </AddTransactionSheet>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Spent (July)</CardTitle>
            <CardDescription>Total expenses for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">$1,250.78</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Transaction</CardTitle>
            <CardDescription>Average amount per transaction.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">$89.34</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Category</CardTitle>
            <CardDescription>The category you spent the most on.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">Shopping</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Total number of transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">10</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Expense Overview</CardTitle>
            <CardDescription>Your spending by category for this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest 5 transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
