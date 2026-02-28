'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export function RepaymentDialog({ 
  open, 
  setOpen, 
  borrowingId 
}: { 
  open: boolean, 
  setOpen: (open: boolean) => void,
  borrowingId: string | null 
}) {
  const { borrowings, addRepayment } = useApp();
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const borrowing = useMemo(() => borrowings.find(b => b.id === borrowingId), [borrowingId, borrowings]);

  const handleSave = async () => {
    if (!borrowingId || !amount) return;
    try {
      await addRepayment(borrowingId, Number(amount), date, notes);
      toast({ title: 'Payment Recorded', description: `Successfully logged payment of ${formatCurrency(Number(amount))}.` });
      setOpen(false);
      setAmount(''); setNotes('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!borrowing) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Repayment</DialogTitle>
          <DialogDescription>
            Record a partial or full payment from/to <strong>{borrowing.contactName}</strong>.
            Current outstanding: {formatCurrency(borrowing.balance)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Amount</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder={borrowing.balance.toString()} 
              max={borrowing.balance}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Paid via UPI" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!amount || Number(amount) <= 0}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
