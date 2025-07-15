
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Transaction } from '@/lib/types';

interface DashboardStatsProps {
    transactions: Transaction[];
    year: number;
    month: number;
}

export function DashboardStats({ transactions, year, month }: DashboardStatsProps) {
    const { settings, loading, loadingSettings } = useApp();

    const stats = useMemo(() => {
        if (!transactions.length) {
            return {
                totalSpent: 0,
                avgTransaction: 0,
            };
        }

        const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const transactionCount = transactions.length;
        const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;
        
        return {
            totalSpent,
            avgTransaction,
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
            <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
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
    
    const selectedMonthName = format(new Date(year, month), 'MMMM');

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Total Spent ({selectedMonthName})</CardTitle>
                    <CardDescription>Total expenses for the selected month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Avg. Transaction</CardTitle>
                    <CardDescription>Average amount per transaction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(stats.avgTransaction)}</p>
                </CardContent>
            </Card>
        </div>
    );
}
