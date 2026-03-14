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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Loader2, CreditCard, Receipt } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<string>('record');

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
      setActiveTab(borrowing?.isClosed ? 'history' : 'record');
    }
  }, [open, borrowing?.isClosed]);

  const handleSave = async () => {
    if (!borrowingId || !amount || Number(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
      await addRepayment(borrowingId, Number(amount), date, notes);
      toast({ 
        title: 'Payment Recorded', 
        description: `Successfully logged payment of ${formatCurrency(Number(amount))}.` 
      });
      
      // If fully paid, the parent state will update. For now, just close.
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
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Repayment Manager
            </DialogTitle>
            <DialogDescription asChild>
              <span className="text-sm text-muted-foreground block">
                Managing record for <strong>{borrowing?.contactName}</strong>.
                {borrowing && (
                  <span className="mt-1 block font-bold text-xl text-primary">
                    Outstanding: {formatCurrency(borrowing.balance)}
                  </span>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 mb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="record" disabled={borrowing?.isClosed}>
                <Receipt className="h-4 w-4 mr-2" />
                Record
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History ({history.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="record" className="flex-1 overflow-y-auto px-6 focus-visible:ring-0 focus-visible:ring-offset-0">
            {!borrowing?.isClosed ? (
              <div className="space-y-4 py-2">
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
                <Button 
                  onClick={handleSave} 
                  className="w-full h-12 text-lg" 
                  disabled={!amount || Number(amount) <= 0 || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                This debt is fully settled. Switch to History to view details.
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden px-6 focus-visible:ring-0 focus-visible:ring-offset-0">
            <ScrollArea className="flex-1 border rounded-md bg-muted/10">
              <div className="p-4 space-y-3">
                {history.length > 0 ? (
                  history.map((h) => (
                    <div key={h.id} className="text-sm p-3 rounded bg-card border shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-green-600">+{formatCurrency(h.amount)}</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {format(parseISO(h.date), 'dd MMM yyyy')}
                          </div>
                        </div>
                        {h.notes && (
                          <div className="text-[11px] text-muted-foreground italic max-w-[60%] text-right bg-muted px-2 py-1 rounded">
                            {h.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <History className="h-8 w-8 opacity-10" />
                    <p>No repayments recorded yet.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-6 pt-4 border-t bg-muted/5">
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} className="w-full">
              Close Manager
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
