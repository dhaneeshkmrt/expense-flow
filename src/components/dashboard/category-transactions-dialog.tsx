
'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/provider';
import type { Transaction } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface CategoryTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string | null;
  transactions: Transaction[];
  budget: number;
  spent: number;
}

type SortKey = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function CategoryTransactionsDialog({
  open,
  onOpenChange,
  categoryName,
  transactions,
  budget,
  spent,
}: CategoryTransactionsDialogProps) {
  const { categories } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const getCategoryIcon = (categoryName: string | null) => {
    if (!categoryName) return null;
    const category = categories.find(c => c.name === categoryName);
    if (category && category.icon) {
      const Icon = typeof category.icon === 'string' ? () => null : category.icon;
      return <Icon className="w-4 h-4" />;
    }
    return null;
  };
  
  const balance = budget - spent;

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'date') {
        const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
        comparison = dateA - dateB;
      } else { // amount
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortKey, sortOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transactions for {categoryName}</DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1 pt-2">
            <div className="flex justify-between">
              <span>Budget:</span>
              <span className="font-medium text-foreground">{formatCurrency(budget)}</span>
            </div>
             <div className="flex justify-between">
              <span>Spent:</span>
              <span className="font-medium text-foreground">{formatCurrency(spent)}</span>
            </div>
             <div className="flex justify-between">
              <span>Balance:</span>
              <span className={`font-medium ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(balance)}</span>
            </div>
          </div>
          <div className="flex justify-end items-center pt-4">
            <Select value={`${sortKey}-${sortOrder}`} onValueChange={(value) => {
              const [key, order] = value.split('-') as [SortKey, SortOrder];
              setSortKey(key);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest first)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4 -mt-4">
          <div className="space-y-4 py-4">
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getCategoryIcon(transaction.category)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(transaction.date), 'PPP')}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatCurrency(transaction.amount)}</span>
                      <Badge variant="outline" className="font-mono">{transaction.paidBy.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{transaction.subcategory}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground pt-10">No transactions for this category in the selected period.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
