
'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { getYear, parseISO, getMonth, getDate, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Wallet, Calendar, Tag, ShoppingBag, Eye, Info, HelpCircle } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface ReportMicrocategory {
  name: string;
  total: number;
  transactions: Transaction[];
}

interface ReportSubcategory {
  name: string;
  total: number;
  transactions: Transaction[];
  microcategories: ReportMicrocategory[];
}

interface ReportCategory {
  name: string;
  total: number;
  icon: React.ElementType;
  subcategories: ReportSubcategory[];
}

const getWeekOfMonth = (date: Date) => {
    const day = getDate(date);
    if (day <= 7) return '1st Week (1-7)';
    if (day <= 14) return '2nd Week (8-14)';
    if (day <= 21) return '3rd Week (15-21)';
    return '4th Week (22-End)';
};

const groupAllTransactionsByMonthAndWeek = (transactions: Transaction[]) => {
    const grouped = transactions.reduce((acc, tx) => {
        const date = parseISO(tx.date);
        const month = format(date, 'MMMM yyyy');
        const week = getWeekOfMonth(date);

        if (!acc[month]) {
            acc[month] = { total: 0, weeks: {} };
        }
        if (!acc[month].weeks[week]) {
            acc[month].weeks[week] = { total: 0, transactions: [] };
        }

        acc[month].total += tx.amount;
        acc[month].weeks[week].total += tx.amount;
        acc[month].weeks[week].transactions.push(tx);

        return acc;
    }, {} as Record<string, { total: number, weeks: Record<string, { total: number, transactions: Transaction[] }> }>);

    return Object.entries(grouped).sort(([monthA], [monthB]) => {
        const dateA = new Date(monthA);
        const dateB = new Date(monthB);
        return dateB.getTime() - dateA.getTime();
    }).map(([month, data]) => ({
        month,
        total: data.total,
        weeks: Object.entries(data.weeks).sort(([weekA], [weekB]) => {
             const weekNumA = parseInt(weekA.match(/^(\d+)/)?.[1] || '0');
            const weekNumB = parseInt(weekB.match(/^(\d+)/)?.[1] || '0');
            return weekNumA - weekNumB;
        }).map(([week, weekData]) => ({
            week,
            total: weekData.total,
            transactions: weekData.transactions
        }))
    }));
};


export default function YearlyReportPage() {
  const { categories, transactions, loading, loadingCategories, selectedYear } = useApp();
  const formatCurrency = useCurrencyFormatter();
  
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.subcategory === 'Category Transfer') return false;
      const transactionYear = getYear(parseISO(t.date));
      return transactionYear === selectedYear;
    });
  }, [transactions, selectedYear]);

  const reportData = useMemo(() => {
    if (loading || loadingCategories) return null;

    const report: Record<string, { total: number; subcategories: Record<string, { total: number; transactions: Transaction[]; microcategories: Record<string, { total: number; transactions: Transaction[] }> }> }> = {};

    yearTransactions.forEach(t => {
      // Ensure category exists
      if (!report[t.category]) {
        report[t.category] = { total: 0, subcategories: {} };
      }
      
      // Ensure subcategory exists
      if (!report[t.category].subcategories[t.subcategory]) {
        report[t.category].subcategories[t.subcategory] = { total: 0, transactions: [], microcategories: {} };
      }
      
      // Ensure microcategory exists if applicable
      if (t.microcategory) {
        if (!report[t.category].subcategories[t.subcategory].microcategories[t.microcategory]) {
          report[t.category].subcategories[t.subcategory].microcategories[t.microcategory] = { total: 0, transactions: [] };
        }
        report[t.category].subcategories[t.subcategory].microcategories[t.microcategory].total += t.amount;
        report[t.category].subcategories[t.subcategory].microcategories[t.microcategory].transactions.push(t);
      }
      
      // Add amounts
      report[t.category].total += t.amount;
      report[t.category].subcategories[t.subcategory].total += t.amount;
      report[t.category].subcategories[t.subcategory].transactions.push(t);
    });

    const categoryIconMap = new Map<string, React.ElementType>();
    categories.forEach(c => categoryIconMap.set(c.name, typeof c.icon === 'string' ? HelpCircle : c.icon));

    return Object.entries(report).map(([categoryName, categoryData]) => ({
        name: categoryName,
        total: categoryData.total,
        icon: categoryIconMap.get(categoryName) || HelpCircle,
        subcategories: Object.entries(categoryData.subcategories).map(([subName, subData]) => ({
            name: subName,
            total: subData.total,
            transactions: subData.transactions,
            microcategories: Object.entries(subData.microcategories).map(([microName, microData]) => ({
                name: microName,
                total: microData.total,
                transactions: microData.transactions,
            })).sort((a,b) => b.total - a.total),
        })).sort((a,b) => b.total - a.total),
    })).sort((a,b) => b.total - a.total);

  }, [categories, yearTransactions, loading, loadingCategories]);

  const monthWeekData = useMemo(() => {
    return groupAllTransactionsByMonthAndWeek(yearTransactions);
  }, [yearTransactions]);

  const grandTotal = useMemo(() => {
      if (!reportData) return 0;
      return reportData.reduce((sum, category) => sum + category.total, 0);
  }, [reportData]);
  
  if (loading || loadingCategories || !reportData) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const getPercentage = (amount: number, total: number) => {
    if (total === 0) return 0;
    return (amount / total) * 100;
  };
  
  const TransactionRow = ({ tx }: { tx: Transaction }) => {
    const Icon = categories.find(c => c.name === tx.category)?.icon || HelpCircle;
    return (
        <TableRow key={tx.id}>
            <TableCell className="w-[100px]">{format(parseISO(tx.date), 'dd MMM')}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    {typeof Icon === 'function' && <Icon className="w-4 h-4 text-muted-foreground" />}
                    <span>{tx.description}</span>
                </div>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
        </TableRow>
    )
  };

  const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => {
    const groupedByMonth = useMemo(() => groupAllTransactionsByMonthAndWeek(transactions), [transactions]);

    return (
        <Accordion type="multiple" className="w-full space-y-2">
            {groupedByMonth.map((monthData, monthIndex) => (
                <AccordionItem value={`month-${monthIndex}`} key={monthIndex} className="border-b-0 rounded-lg bg-background/50 px-3">
                    <AccordionTrigger className="py-3 text-base hover:no-underline [&[data-state=open]>svg]:text-primary">
                        <div className="flex items-center gap-4 w-full">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="font-semibold flex-1 text-left">{monthData.month}</span>
                            <span className="font-bold text-right w-28">{formatCurrency(monthData.total)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pl-8 pr-2 space-y-2">
                        <Accordion type="multiple" className="w-full space-y-2">
                            {monthData.weeks.map((weekData, weekIndex) => (
                                <AccordionItem value={`week-${monthIndex}-${weekIndex}`} key={weekIndex} className="border-b-0 bg-background rounded-md">
                                    <AccordionTrigger className="py-2.5 px-3 text-sm hover:no-underline [&[data-state=open]>svg]:text-primary">
                                        <div className="flex items-center gap-4 w-full">
                                            <span className="font-medium flex-1 text-left">{weekData.week}</span>
                                            <span className="font-semibold text-right w-24">{formatCurrency(weekData.total)}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pt-2 pb-4">
                                        <Table>
                                            <TableBody>
                                                {weekData.transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yearly Spending Report</h1>
        <p className="text-muted-foreground">Hierarchical spending breakdown for {selectedYear}, excluding category transfers.</p>
      </div>

       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Spending for {selectedYear}
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="month">By Month</TabsTrigger>
        </TabsList>
        <TabsContent value="category">
            <Card>
                <CardContent className="p-4 md:p-6">
                {reportData.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2">
                    {reportData.map((category, catIndex) => {
                        const Icon = category.icon;
                        const categoryPercentage = getPercentage(category.total, grandTotal);

                        return (
                        <AccordionItem value={`cat-${catIndex}`} key={catIndex} className="border-b-0 rounded-lg bg-muted/50 px-4">
                            <AccordionTrigger className="py-4 text-lg hover:no-underline">
                            <div className="flex items-center gap-4 w-full">
                                <Icon className="w-6 h-6 text-primary" />
                                <span className="font-semibold flex-1 text-left">{category.name}</span>
                                <div className="flex items-center gap-4 w-1/3">
                                <Progress value={categoryPercentage} className="h-2 w-full" />
                                <span className="font-bold text-right w-32">{formatCurrency(category.total)}</span>
                                </div>
                            </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pl-10 pr-4 space-y-2">
                            <Accordion type="multiple" className="w-full space-y-2">
                                {category.subcategories.map((sub, subIndex) => (
                                <AccordionItem value={`sub-${catIndex}-${subIndex}`} key={subIndex} className="border-b-0 bg-background rounded-md">
                                    <AccordionTrigger className="py-3 px-3 text-base hover:no-underline [&[data-state=open]>svg]:text-primary">
                                    <div className="flex items-center gap-4 w-full">
                                            <span className="font-medium flex-1 text-left">{sub.name}</span>
                                            <div className="flex items-center gap-4 w-1/2">
                                                <Progress value={getPercentage(sub.total, category.total)} className="h-1.5 w-full"/>
                                                <span className="font-semibold text-right w-28">{formatCurrency(sub.total)}</span>
                                            </div>
                                    </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-3">
                                    {sub.microcategories.length > 0 ? (
                                        <Accordion type="multiple" className="w-full space-y-2">
                                        {sub.microcategories.map((micro, microIndex) => (
                                            <AccordionItem value={`micro-${catIndex}-${subIndex}-${microIndex}`} key={microIndex} className="border-b-0 bg-muted/30 rounded-md">
                                                <AccordionTrigger className="py-2.5 px-3 text-sm hover:no-underline [&[data-state=open]>svg]:text-primary">
                                                <div className="flex items-center gap-4 w-full">
                                                        <span className="font-normal flex-1 text-left">{micro.name}</span>
                                                        <div className="flex items-center gap-4 w-2/3">
                                                            <Progress value={getPercentage(micro.total, sub.total)} className="h-1 w-full"/>
                                                            <span className="font-medium text-right w-24">{formatCurrency(micro.total)}</span>
                                                        </div>
                                                </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-4 pt-2 pb-4">
                                                    <TransactionTable transactions={micro.transactions} />
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                        </Accordion>
                                    ) : (
                                        <TransactionTable transactions={sub.transactions} />
                                    )}
                                    </AccordionContent>
                                </AccordionItem>
                                ))}
                            </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
                        <Info className="w-12 h-12" />
                    <p className="text-lg">No spending activity recorded for {selectedYear}.</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="month">
            <Card>
                <CardContent className="p-4 md:p-6">
                    <TransactionTable transactions={yearTransactions} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
