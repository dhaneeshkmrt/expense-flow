import { Wallet } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center p-2 rounded-lg bg-primary text-primary-foreground">
        <Wallet className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-primary">ExpenseFlow</h1>
    </div>
  );
}
