'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Loader2, CreditCard } from 'lucide-react';

export function RecordPaymentDialog({ 
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const borrowing = useMemo(() => borrowings.find(b => b.id === borrowingId), [borrowingId, borrowings]);
  
  // Reset form when opening
  useEffect(() => {
    if (open) {
      setAmount('');
      setNotes('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open]);

  const handleSave = async () => {
    if (!borrowingId || !amount || Number(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
      await addRepayment(borrowingId, Number(amount), date, notes);
      toast({ 
        title: 'Payment Recorded', 
        description: `Successfully logged payment of ${formatCurrency(Number(amount))}.` 
      });
      
      setOpen(false);
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to record payment', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!borrowing && open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!isSubmitting) setOpen(val); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Repayment
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-2">
              Managing debt for <strong>{borrowing?.contactName}</strong>.
              {borrowing && (
                <div className="mt-1 font-bold text-lg text-primary">
                  Outstanding: {formatCurrency(borrowing.balance)}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Amount</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="Enter amount..."
              max={borrowing?.balance}
              disabled={isSubmitting}
              className="text-lg h-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                disabled={isSubmitting} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. UPI, Cash"
                disabled={isSubmitting} 
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1" 
            disabled={!amount || Number(amount) <= 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
