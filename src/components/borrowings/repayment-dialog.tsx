'use client';

import { useMemo } from 'react';
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
import { format, parseISO } from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';

export function RepaymentHistoryDialog({ 
  open, 
  setOpen, 
  borrowingId 
}: { 
  open: boolean, 
  setOpen: (open: boolean) => void,
  borrowingId: string | null 
}) {
  const { borrowings, borrowingRepayments } = useApp();
  const formatCurrency = useCurrencyFormatter();

  const borrowing = useMemo(() => borrowings.find(b => b.id === borrowingId), [borrowingId, borrowings]);
  
  const history = useMemo(() => {
    return borrowingRepayments
      .filter(r => r.borrowingId === borrowingId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [borrowingId, borrowingRepayments]);

  if (!borrowing && open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <History className="h-5 w-5" />
              Repayment History
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground mt-2">
                All payments recorded for <strong>{borrowing?.contactName}</strong>.
                {borrowing && (
                  <div className="mt-1 font-bold text-lg text-primary">
                    Outstanding: {formatCurrency(borrowing.balance)}
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden px-6">
          <ScrollArea className="flex-1 border rounded-md bg-muted/10 my-4">
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
        </div>

        <div className="p-6 pt-4 border-t bg-muted/5">
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
              Close History
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
