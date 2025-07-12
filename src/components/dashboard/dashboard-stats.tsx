'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, isWithinInterval } from 'date-fns';

export function DashboardStats() {
    const { transactions, settings, loading, loadingSettings } = useApp();

    const stats = useMemo(() => {
        if (!transactions.length) {
            return {
                totalSpent: 0,
                avgTransaction: 0,
                topCategory: 'N/A',
                transactionCount: 0,
            };
        }

        const currentMonthStart = startOfMonth(new Date());
        const currentMonthTransactions = transactions.filter(t => 
            isWithinInterval(new Date(t.date), { start: currentMonthStart, end: new Date() })
        );

        const totalSpent = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
        const transactionCount = currentMonthTransactions.length;
        const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;

        const categoryCounts = currentMonthTransactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
        
        return {
            totalSpent,
            avgTransaction,
            topCategory,
            transactionCount,
        };

    }, [transactions]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount).replace('$', settings.currency);
    };

    if (loading || loadingSettings) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }
    
    const currentMonthName = format(new Date(), 'MMMM');

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle>Total Spent ({currentMonthName})</CardTitle>
                    <CardDescription>Total expenses for the current month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Avg. Transaction</CardTitle>
                    <CardDescription>Average amount per transaction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(stats.avgTransaction)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top Category</CardTitle>
                    <CardDescription>The category you spent the most on.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{stats.topCategory}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Total number of transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{stats.transactionCount}</p>
                </CardContent>
            </Card>
        </div>
    );
}
