
'use client';

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
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DayTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  transactions: Transaction[];
}

type SortKey = 'time' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function DayTransactionsDialog({
  open,
  onOpenChange,
  date,
  transactions,
}: DayTransactionsDialogProps) {
  const { settings, categories } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount).replace('$', settings.currency);
  };

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.icon) {
      const Icon = typeof category.icon === 'string' ? () => null : category.icon;
      return <Icon className="w-4 h-4" />;
    }
    return null;
  };
  
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'time') {
        comparison = a.time.localeCompare(b.time);
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
          <DialogTitle>Transactions for {date ? format(date, 'PPP') : ''}</DialogTitle>
           <div className="flex justify-between items-center pt-2">
            <DialogDescription>
              Total spent: <span className="font-bold">{formatCurrency(totalAmount)}</span>
            </DialogDescription>
             <Select value={`${sortKey}-${sortOrder}`} onValueChange={(value) => {
              const [key, order] = value.split('-') as [SortKey, SortOrder];
              setSortKey(key);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time-asc">Time (Ascending)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
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
                        {transaction.category} / {transaction.subcategory}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatCurrency(transaction.amount)}</span>
                      <Badge variant="outline" className="font-mono">{transaction.paidBy.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{transaction.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No transactions for this day.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
