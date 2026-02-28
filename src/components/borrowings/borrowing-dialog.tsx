'use client';

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, parseISO } from 'date-fns';
import type { Borrowing } from '@/lib/types';

export function BorrowingDialog({ 
  open, 
  setOpen,
  borrowing = null
}: { 
  open: boolean, 
  setOpen: (open: boolean) => void,
  borrowing?: Borrowing | null
}) {
  const { borrowingContacts, addBorrowing, editBorrowing } = useApp();
  const { toast } = useToast();
  
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<'Lent' | 'Borrowed'>('Lent');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const isEditing = !!borrowing;

  useEffect(() => {
    if (open) {
      if (borrowing) {
        setContactId(borrowing.contactId);
        setType(borrowing.type);
        setAmount(borrowing.amount.toString());
        setStartDate(borrowing.startDate);
        setDueDate(borrowing.dueDate);
        setNotes(borrowing.notes || '');
      } else {
        reset();
      }
    }
  }, [open, borrowing]);

  const handleSave = async () => {
    if (!contactId || !amount) return;
    
    try {
      if (isEditing && borrowing) {
        await editBorrowing(borrowing.id, {
          startDate,
          dueDate,
          notes,
          amount: Number(amount)
        });
        toast({ title: 'Record Updated', description: `Successfully updated the lending record for ${borrowing.contactName}.` });
      } else {
        const contact = borrowingContacts.find(c => c.id === contactId);
        if (!contact) return;

        await addBorrowing({
          contactId,
          contactName: contact.name,
          type,
          amount: Number(amount),
          startDate,
          dueDate,
          notes
        });
        toast({ title: 'Debt Recorded', description: `Recorded ${type} transaction for ${contact.name}.` });
      }
      setOpen(false);
      reset();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const reset = () => {
    setContactId(''); setType('Lent'); setAmount('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Lending Record' : 'Record New Debt'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the dates or conditions for this debt.' 
              : 'Track money given to or taken from a contact.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Person</label>
              <Select onValueChange={setContactId} value={contactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {borrowingContacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} (Score: {c.creditScore})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select onValueChange={(v: any) => setType(v)} value={type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lent">I am Lending (Lent)</SelectItem>
                  <SelectItem value="Borrowed">I am Borrowing (Borrowed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Total Amount</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00" 
              disabled={isEditing && (borrowing?.amount !== borrowing?.balance)} // Prevent amount edit if repayments started
            />
            {isEditing && borrowing?.amount !== borrowing?.balance && (
              <p className="text-[10px] text-muted-foreground italic">Amount cannot be edited once partial repayments have begun.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for debt..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={(!contactId && !isEditing) || !amount}>
            {isEditing ? 'Save Changes' : 'Save Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
