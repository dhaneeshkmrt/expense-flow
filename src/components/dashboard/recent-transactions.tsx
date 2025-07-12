'use client';

import { useApp } from '@/lib/provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { categories } from '@/lib/data';

export function RecentTransactions() {
  const { transactions } = useApp();

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      const Icon = category.icon;
      return <Icon className="w-4 h-4" />;
    }
    return null;
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
            -${transaction.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
