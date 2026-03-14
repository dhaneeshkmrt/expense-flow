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
import { format, parseISO } from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, Loader2 } from 'lucide-react';

export function RepaymentDialog({ 
  open, 
  setOpen, 
  borrowingId 
}: { 
  open: boolean, 
  setOpen: (open: boolean) => void,
  borrowingId: string | null 
}) {
  const { borrowings, borrowingRepayments, addRepayment } = useApp();
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const borrowing = useMemo(() => borrowings.find(b => b.id === borrowingId), [borrowingId, borrowings]);
  
  const history = useMemo(() => {
    return borrowingRepayments
      .filter(r => r.borrowingId === borrowingId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [borrowingId, borrowingRepayments]);

  // Reset form when opening/closing
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
      
      // Close the dialog immediately
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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Repayment Manager</DialogTitle>
          <DialogDescription>
            Record payments for <strong>{borrowing?.contactName}</strong>.
            {borrowing && (
              <div className="mt-1 font-semibold text-primary">
                Current outstanding: {formatCurrency(borrowing.balance)}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
          {/* Form Section */}
          {!borrowing?.isClosed && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount</label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="Enter amount..."
                  max={borrowing?.balance}
                  disabled={isSubmitting}
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
              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={!amount || Number(amount) <= 0 || isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record New Payment
              </Button>
            </div>
          )}

          {/* History Section */}
          <div className="flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <History className="h-4 w-4" />
              Repayment History
            </div>
            <ScrollArea className="flex-1 rounded-md border p-2">
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="text-sm p-2 rounded bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-600">+{formatCurrency(h.amount)}</span>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(h.date), 'dd MMM yyyy')}</span>
                      </div>
                      {h.notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-1">{h.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No repayments recorded yet.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
