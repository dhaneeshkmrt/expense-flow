
'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/provider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const copyBudgetSchema = z.object({
  sourceMonth: z.string().min(1, 'Please select a source month.'),
});

type CopyBudgetFormValues = z.infer<typeof copyBudgetSchema>;

interface CopyBudgetDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CopyBudgetDialog({ open, setOpen }: CopyBudgetDialogProps) {
  const { categories, selectedMonth, selectedYear } = useApp();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetMonthKey = format(new Date(selectedYear, selectedMonth), 'yyyy-MM');
  const targetMonthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  const availableBudgetMonths = useMemo(() => {
    const months = new Set<string>();
    categories.forEach((cat) => {
      if (cat.budget) {
        // For now, we'll just add the current month as available
        // This would need to be enhanced with actual budget history storage
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        if (currentMonthKey !== targetMonthKey) {
          months.add(currentMonthKey);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [categories, targetMonthKey]);

  const form = useForm<CopyBudgetFormValues>({
    resolver: zodResolver(copyBudgetSchema),
    defaultValues: {
      sourceMonth: '',
    },
  });

  const onSubmit = async (data: CopyBudgetFormValues) => {
    setIsSubmitting(true);
    try {
      await copyBudgetsFromMonth(data.sourceMonth, targetMonthKey);
      toast({
        title: 'Budget Copied',
        description: `Budgets from ${format(
          parse(data.sourceMonth, 'yyyy-MM', new Date()),
          'MMMM yyyy'
        )} have been copied to ${targetMonthName}.`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'An error occurred while copying budgets.',
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
          <DialogTitle>Copy Budget for {targetMonthName}</DialogTitle>
          <DialogDescription>
            No budget is set for {targetMonthName}. You can copy the budget from a
            previous month.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="sourceMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Copy From</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a month to copy from" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBudgetMonths.map((monthKey) => (
                        <SelectItem key={monthKey} value={monthKey}>
                          {format(
                            parse(monthKey, 'yyyy-MM', new Date()),
                            'MMMM yyyy'
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                Copy Budget
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
