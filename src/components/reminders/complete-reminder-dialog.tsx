'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/lib/provider';
import type { ReminderInstance } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';

const completeReminderSchema = z.object({
  date: z.date(),
  paidBy: z.string().min(1, 'Please select a payer.'),
});

type CompleteReminderFormValues = z.infer<typeof completeReminderSchema>;


interface CompleteReminderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  instance: ReminderInstance;
}

export function CompleteReminderDialog({ open, setOpen, instance }: CompleteReminderDialogProps) {
  const { addTransaction, completeReminderInstance, userTenant } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formatCurrency = useCurrencyFormatter();
  
  const form = useForm<CompleteReminderFormValues>({
    resolver: zodResolver(completeReminderSchema),
    defaultValues: {
      date: new Date(),
      paidBy: instance.reminder.paidBy,
    }
  });

  useEffect(() => {
    if (open && instance) {
      form.reset({
        date: new Date(),
        paidBy: instance.reminder.paidBy,
      });
    }
  }, [open, instance, form]);

  const paidByOptions = userTenant?.paidByOptions || [];
  
  const handleComplete = async (data: CompleteReminderFormValues) => {
    setIsSubmitting(true);
    try {
      const transactionData = {
        ...instance.reminder,
        date: format(data.date, 'yyyy-MM-dd'),
        time: format(data.date, 'HH:mm'),
        paidBy: data.paidBy,
        notes: `Reminder: ${instance.reminder.notes || ''}`.trim(),
      };
      
      const newTransactionId = await addTransaction(transactionData);
      
      await completeReminderInstance(instance.reminder, instance.dueDate, newTransactionId);
      
      toast({
        title: 'Reminder Completed!',
        description: `Transaction for "${instance.reminder.description}" has been created.`,
      });
      setOpen(false);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to complete reminder.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Reminder</DialogTitle>
          <DialogDescription>
            This will create a new transaction. You can adjust the date and payment method below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleComplete)} className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                <p><strong>Description:</strong> {instance.reminder.description}</p>
                <p><strong>Amount:</strong> {formatCurrency(instance.reminder.amount)}</p>
                <p><strong>Category:</strong> {instance.reminder.category} / {instance.reminder.subcategory}</p>
                <p><strong>Scheduled For:</strong> {format(instance.dueDate, 'PPP')}</p>
            </div>
            
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                   <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground" )}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                        </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select payer..."/></SelectTrigger></FormControl>
                        <SelectContent>{paidByOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Create Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}