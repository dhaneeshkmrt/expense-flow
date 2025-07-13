'use client';

import { useApp } from '@/lib/provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Transaction } from '@/lib/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { categories, settings } = useApp();

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && category.icon) {
      const Icon = typeof category.icon === 'string' ? () => null : category.icon;
      return <Icon className="w-4 h-4" />;
    }
    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount).replace('$', settings.currency);
  };

  return (
    <div className="space-y-4">
      {transactions.slice(0, 5).map((transaction) => (
        <div key={transaction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {getCategoryIcon(transaction.category)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">{transaction.category}</p>
          </div>
          <div className="ml-auto font-medium">
            -{formatCurrency(transaction.amount)}
          </div>
        </div>
      ))}
       {transactions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">No transactions for this period.</p>
      )}
    </div>
  );
}
