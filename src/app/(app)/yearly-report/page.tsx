
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { getYear, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ReportData {
  id: string;
  name: string;
  icon: React.ElementType;
  total: number;
  subcategories: {
    id: string;
    name: string;
    total: number;
    microcategories: {
      id: string;
      name: string;
      total: number;
    }[];
  }[];
}

export default function YearlyReportPage() {
  const { categories, transactions, loading, loadingCategories, selectedYear } = useApp();
  const formatCurrency = useCurrencyFormatter();

  const reportData = useMemo(() => {
    if (loading || loadingCategories) return [];

    const yearTransactions = transactions.filter(t => {
      if (t.subcategory === 'Category Transfer') return false;
      const transactionYear = getYear(parseISO(t.date));
      return transactionYear === selectedYear;
    });

    const categoryTotals = new Map<string, number>();
    const subcategoryTotals = new Map<string, number>();
    const microcategoryTotals = new Map<string, number>();

    yearTransactions.forEach(t => {
      const category = categories.find(c => c.name === t.category);
      if (!category) return;
      
      categoryTotals.set(category.id, (categoryTotals.get(category.id) || 0) + t.amount);

      const subcategory = category.subcategories.find(s => s.name === t.subcategory);
      if (subcategory) {
        subcategoryTotals.set(subcategory.id, (subcategoryTotals.get(subcategory.id) || 0) + t.amount);

        if (t.microcategory) {
          const microcategory = subcategory.microcategories.find(m => m.name === t.microcategory);
          if (microcategory) {
            microcategoryTotals.set(microcategory.id, (microcategoryTotals.get(microcategory.id) || 0) + t.amount);
          }
        }
      }
    });

    return categories.map(category => {
      const categoryTotal = categoryTotals.get(category.id) || 0;
      if (categoryTotal === 0) return null;

      return {
        id: category.id,
        name: category.name,
        icon: typeof category.icon === 'string' ? () => null : category.icon,
        total: categoryTotal,
        subcategories: category.subcategories.map(sub => {
          const subTotal = subcategoryTotals.get(sub.id) || 0;
          if (subTotal === 0) return null;
          
          return {
            id: sub.id,
            name: sub.name,
            total: subTotal,
            microcategories: (sub.microcategories || []).map(micro => {
              const microTotal = microcategoryTotals.get(micro.id) || 0;
              if (microTotal === 0) return null;
              
              return {
                id: micro.id,
                name: micro.name,
                total: microTotal,
              };
            }).filter((m): m is Exclude<typeof m, null> => m !== null)
              .sort((a,b) => b.total - a.total),
          };
        }).filter((s): s is Exclude<typeof s, null> => s !== null)
          .sort((a,b) => b.total - a.total),
      };
    }).filter((c): c is Exclude<typeof c, null> => c !== null)
      .sort((a,b) => b.total - a.total);

  }, [categories, transactions, selectedYear, loading, loadingCategories]);

  const grandTotal = useMemo(() => {
      return reportData.reduce((sum, category) => sum + category.total, 0);
  }, [reportData]);

  if (loading || loadingCategories) {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yearly Spending Report</h1>
        <p className="text-muted-foreground">Hierarchical spending breakdown for {selectedYear}.</p>
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

      <Card>
        <CardContent className="p-4 md:p-6">
          {reportData.length > 0 ? (
             <Accordion type="multiple" className="w-full space-y-2">
              {reportData.map((category) => {
                const Icon = category.icon;
                const categoryPercentage = getPercentage(category.total, grandTotal);

                return (
                  <AccordionItem value={category.id} key={category.id} className="border-b-0 rounded-lg bg-muted/50 px-4">
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
                        {category.subcategories.map(sub => {
                            const subPercentage = getPercentage(sub.total, category.total);
                            return (
                                <Accordion type="single" collapsible key={sub.id} className="w-full bg-background/50 rounded-md px-3">
                                  <AccordionItem value={sub.id} className="border-b-0">
                                    <AccordionTrigger className="py-3 text-base hover:no-underline [&[data-state=open]>svg]:text-primary">
                                       <div className="flex items-center gap-4 w-full">
                                            <span className="font-medium flex-1 text-left">{sub.name}</span>
                                            <div className="flex items-center gap-4 w-1/2">
                                                <Progress value={subPercentage} className="h-1.5 w-full"/>
                                                <span className="font-semibold text-right w-28">{formatCurrency(sub.total)}</span>
                                            </div>
                                       </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-3 pl-8 pr-2 space-y-2">
                                        {sub.microcategories.map(micro => (
                                             <div key={micro.id} className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{micro.name}</span>
                                                <span className="font-medium">{formatCurrency(micro.total)}</span>
                                             </div>
                                        ))}
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                            )
                        })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
             </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>No spending activity for {selectedYear}.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
