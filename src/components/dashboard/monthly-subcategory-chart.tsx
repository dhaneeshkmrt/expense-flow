'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList, Cell } from 'recharts';
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/lib/provider';
import type { Transaction } from '@/lib/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import SubcategoryTransactionsDialog from './subcategory-transactions-dialog';

interface MonthlySubcategoryChartProps {
    transactions: Transaction[];
}

interface SubcategoryChartData {
    categoryName: string;
    subcategoryName: string;
    displayName: string;
    total: number;
    budget: number;
    percentage: number;
    balance: number;
    transactions: Transaction[];
}

export function MonthlySubcategoryChart({ transactions }: MonthlySubcategoryChartProps) {
    const { categories } = useApp();
    const formatCurrency = useCurrencyFormatter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSubcategoryData, setSelectedSubcategoryData] = useState<SubcategoryChartData | null>(null);

    const handleBarClick = useCallback((data: any) => {
        if (!data || !data.activePayload || !data.activePayload[0] || !data.activePayload[0].payload) return;
        setSelectedSubcategoryData(data.activePayload[0].payload);
        setDialogOpen(true);
    }, []);

    const data = useMemo(() => {
        const subcategorySpending = new Map<string, { categoryName: string; subcategoryName: string; total: number; budget: number; transactions: Transaction[] }>();

        // Only include subcategories that have a budget > 0 set for the month
        categories.forEach(cat => {
            (cat.subcategories || []).forEach(sub => {
                const budget = sub.budget || 0;
                if (budget > 0) {
                    const key = `${cat.name}___${sub.name}`;
                    subcategorySpending.set(key, { 
                        categoryName: cat.name, 
                        subcategoryName: sub.name, 
                        total: 0, 
                        budget, 
                        transactions: [] 
                    });
                }
            });
        });

        // Aggregate matching transactions for those budgeted subcategories
        transactions.forEach(txn => {
            const key = `${txn.category}___${txn.subcategory}`;
            const subData = subcategorySpending.get(key);
            if (subData) {
                subData.total += txn.amount;
                subData.transactions.push(txn);
            }
        });

        return Array.from(subcategorySpending.values())
            .map(({ categoryName, subcategoryName, total, budget, transactions }): SubcategoryChartData => ({
                categoryName,
                subcategoryName,
                displayName: `${subcategoryName} (${categoryName})`,
                total,
                budget,
                percentage: budget > 0 ? Math.round((total / budget) * 100) : 0,
                balance: budget - total,
                transactions
            }))
            .filter(d => d.total > 0)
            .sort((a, b) => b.percentage - a.percentage || b.budget - a.budget);
    }, [categories, transactions]);

    const maxPercentage = useMemo(() => {
        const max = Math.max(...data.map(d => d.percentage), 100);
        return Math.ceil(max / 10) * 10; // Round up to nearest 10
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload as SubcategoryChartData;
            const isOver = item.total > item.budget;
            return (
                <div className="rounded-lg border bg-background p-2.5 shadow-sm space-y-1">
                    <p className="font-bold text-sm">{item.subcategoryName} <span className="text-xs text-muted-foreground font-normal">({item.categoryName})</span></p>
                    <p className="text-xs text-muted-foreground">
                        Spent: <span className={`font-semibold ${isOver ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(item.total)}</span> / {formatCurrency(item.budget)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Balance: <span className={`font-semibold ${isOver ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(item.balance)}</span> {isOver ? '(Exceeded!)' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="text-center py-10 space-y-1">
                <p className="text-muted-foreground text-sm font-medium">No subcategory expenses recorded for this month.</p>
                <p className="text-xs text-muted-foreground">Subcategories with budget set will appear here once spending begins.</p>
            </div>
        );
    }

    return (
        <>
            <ResponsiveContainer width="100%" height={Math.max(250, data.length * 45)}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} onClick={handleBarClick}>
                    <XAxis 
                        type="number" 
                        domain={[0, maxPercentage]} 
                        tickFormatter={(tick) => `${tick}%`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <YAxis 
                        type="category" 
                        dataKey="subcategoryName" 
                        width={90} 
                        tick={{ fontSize: 12, width: 85, textAnchor: 'end' }}
                        interval={0}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false} 
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} className="cursor-pointer">
                        {data.map((entry, index) => (
                            <Cell key={`sub-cell-${index}`} fill={entry.percentage > 100 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                        ))}
                        <LabelList 
                            dataKey="percentage" 
                            position="right" 
                            formatter={(val: number) => `${val}%${val > 100 ? ' ⚠' : ''}`} 
                            className="text-xs font-bold" 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {selectedSubcategoryData && (
                <SubcategoryTransactionsDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    categoryName={selectedSubcategoryData.categoryName}
                    subcategoryName={selectedSubcategoryData.subcategoryName}
                    transactions={selectedSubcategoryData.transactions}
                    budget={selectedSubcategoryData.budget}
                    spent={selectedSubcategoryData.total}
                />
            )}
        </>
    );
}
