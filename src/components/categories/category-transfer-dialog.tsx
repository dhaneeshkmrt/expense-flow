
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useApp } from '@/lib/provider';
import type { Category, Transaction } from '@/lib/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const transferSchema = z.object({
  sourceCategoryId: z.string().min(1, 'Please select a source category.'),
  amount: z.coerce.number().positive('Transfer amount must be positive.'),
  notes: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface CategoryTransferDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  destinationCategory: Category;
  allCategories: Category[];
  filteredTransactions: Transaction[];
}

export default function CategoryTransferDialog({
  open,
  setOpen,
  destinationCategory,
  allCategories,
  filteredTransactions
}: CategoryTransferDialogProps) {
  const { handleCategoryTransfer } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const overageAmount = useMemo(() => {
    const spent = filteredTransactions
      .filter(t => t.category === destinationCategory.name)
      .reduce((sum, t) => sum + t.amount, 0);
    const budget = destinationCategory.budget || 0;
    return Math.max(0, spent - budget);
  }, [destinationCategory, filteredTransactions]);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      sourceCategoryId: '',
      amount: overageAmount > 0 ? overageAmount : undefined,
      notes: `Transfer to cover overspending in ${destinationCategory.name}`,
    },
  });
  
  useEffect(() => {
      form.reset({
        sourceCategoryId: '',
        amount: overageAmount > 0 ? overageAmount : undefined,
        notes: `Transfer to cover overspending in ${destinationCategory.name}`,
      });
  }, [destinationCategory, overageAmount, form, open]);


  const sourceCategories = useMemo(() => {
    return allCategories.filter(c => c.id !== destinationCategory.id && c.name !== 'Loan');
  }, [allCategories, destinationCategory.id]);
  
  const selectedSourceCategoryId = form.watch('sourceCategoryId');

  const sourceCategoryBalance = useMemo(() => {
    if (!selectedSourceCategoryId) return 0;
    const sourceCategory = allCategories.find(c => c.id === selectedSourceCategoryId);
    if (!sourceCategory) return 0;

    const spent = filteredTransactions
      .filter(t => t.category === sourceCategory.name)
      .reduce((sum, t) => sum + t.amount, 0);
    return (sourceCategory.budget || 0) - spent;
  }, [selectedSourceCategoryId, allCategories, filteredTransactions]);

  const onSubmit = async (data: TransferFormValues) => {
    setIsSubmitting(true);
    try {
      await handleCategoryTransfer({
          ...data,
          destinationCategoryId: destinationCategory.id,
      });
      toast({
        title: 'Transfer Successful',
        description: `${formatCurrency(data.amount)} transferred.`,
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Transfer Failed',
        description: error.message,
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
          <DialogTitle>Transfer Funds to "{destinationCategory.name}"</DialogTitle>
          <DialogDescription>
            This category is over budget by {formatCurrency(overageAmount)}. Transfer funds from another category to balance it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="sourceCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer From</FormLabel>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sourceCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSourceCategoryId && (
                        <span className={cn("text-sm font-medium", sourceCategoryBalance < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            ({formatCurrency(sourceCategoryBalance)})
                        </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a reason for the transfer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Transfer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
