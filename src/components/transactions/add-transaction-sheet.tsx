
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useApp } from '@/lib/provider';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { suggestTransactionCategories } from '@/ai/flows/categorize-transaction';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Transaction } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const transactionSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  category: z.string().min(1, 'Please select a category.'),
  subcategory: z.string().min(1, 'Please select a subcategory.'),
  microcategory: z.string().optional(),
  paidBy: z.string().min(1, 'Please select a payer.'),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const paidByOptions = ['dkd', 'nd', 'dkc', 'nc'];

interface AddTransactionSheetProps {
  children?: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  transaction?: Omit<Transaction, 'userId' | 'tenantId'>;
}

export default function AddTransactionSheet({
  children,
  open: controlledOpen,
  setOpen: setControlledOpen,
  transaction,
}: AddTransactionSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { categories, addTransaction, editTransaction } = useApp();
  const { toast } = useToast();
  const [isAiPending, startAiTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!transaction;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: isEditing ? {
        ...transaction,
        date: parseISO(transaction.date),
        amount: transaction.amount,
        microcategory: transaction.microcategory || '',
        notes: transaction.notes || '',
      } : {
        date: new Date(),
        time: format(new Date(), 'HH:mm'),
        description: '',
        amount: 0,
        category: '',
        subcategory: '',
        microcategory: '',
        paidBy: '',
        notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(isEditing && transaction ? {
        ...transaction,
        date: parseISO(transaction.date),
        amount: transaction.amount,
        microcategory: transaction.microcategory || '',
        notes: transaction.notes || '',
      } : {
        date: new Date(),
        time: format(new Date(), 'HH:mm'),
        description: '',
        amount: 0,
        category: '',
        subcategory: '',
        microcategory: '',
        paidBy: '',
        notes: '',
      });
    }
  }, [open, isEditing, transaction, form]);

  const selectedCategoryName = form.watch('category');
  const selectedSubcategoryName = form.watch('subcategory');
  const descriptionToDebounce = form.watch('description');
  const debouncedDescription = useDebounce(descriptionToDebounce, 500);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.name === selectedCategoryName);
  }, [selectedCategoryName, categories]);

  const subcategories = useMemo(() => {
    return selectedCategory ? selectedCategory.subcategories : [];
  }, [selectedCategory]);

  const microcategories = useMemo(() => {
      const subcategory = subcategories.find(s => s.name === selectedSubcategoryName);
      return subcategory ? (subcategory.microcategories || []) : [];
  }, [selectedSubcategoryName, subcategories]);

  useEffect(() => {
    if (!isEditing && debouncedDescription.length > 5) {
      startAiTransition(async () => {
        try {
          const allCategories = categories.map(c => c.name);
          const allSubcategories = categories.flatMap(c => c.subcategories.map(s => s.name));
          
          const result = await suggestTransactionCategories({
            transactionDescription: debouncedDescription,
            availableCategories: allCategories,
            availableSubcategories: allSubcategories,
          });

          if (result.suggestedCategory && allCategories.includes(result.suggestedCategory)) {
            form.setValue('category', result.suggestedCategory, { shouldValidate: true });
          }
           if (result.suggestedSubcategory) {
            const categoryForSub = categories.find(c => c.name === result.suggestedCategory);
            if(categoryForSub && categoryForSub.subcategories.some(s => s.name === result.suggestedSubcategory)){
              form.setValue('subcategory', result.suggestedSubcategory, { shouldValidate: true });
            }
          }
        } catch (error) {
          console.error('AI suggestion failed:', error);
        }
      });
    }
  }, [debouncedDescription, categories, form, isEditing]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    const currentSubcategory = form.getValues('subcategory');
    const newSubcategories = categories.find(c => c.name === selectedCategoryName)?.subcategories || [];
    if (!newSubcategories.some(s => s.name === currentSubcategory)) {
      form.setValue('subcategory', '');
      form.setValue('microcategory', '');
    }
  }, [selectedCategoryName, form, categories]);
  
  useEffect(() => {
      if (!form.formState.isDirty) return;
      const currentMicrocategory = form.getValues('microcategory');
      const newMicrocategories = categories.find(c => c.name === selectedCategoryName)?.subcategories.find(s => s.name === selectedSubcategoryName)?.microcategories || [];
      if(!newMicrocategories.some(m => m.name === currentMicrocategory)) {
          form.setValue('microcategory', '');
      }
  }, [selectedSubcategoryName, form, selectedCategoryName, categories]);

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    const submissionData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
        microcategory: data.microcategory || '',
    };
    
    if (isEditing && transaction) {
        await editTransaction(transaction.id, submissionData);
        toast({
            title: 'Transaction Updated',
            description: `Successfully updated "${data.description}".`,
        });
    } else {
        await addTransaction(submissionData);
        toast({
            title: 'Transaction Added',
            description: `Successfully added "${data.description}".`,
        });
    }

    form.reset();
    setIsSubmitting(false);
    setOpen(false);
  };

  const sheetTitle = isEditing ? 'Edit Transaction' : 'Add a New Transaction';
  const sheetDescription = isEditing
    ? 'Update the details of your transaction below.'
    : 'Enter the details of your transaction below.';
    
  const chipRadioClasses = "cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Weekly groceries" {...field} />
                      </FormControl>
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center">
                        Category {isAiPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2"
                        >
                          {categories.map((cat) => (
                            <FormItem key={cat.id}>
                              <FormControl>
                                <RadioGroupItem value={cat.name} id={`cat-${cat.id}`} className="sr-only peer" />
                              </FormControl>
                              <Label htmlFor={`cat-${cat.id}`} className={chipRadioClasses}>
                                {cat.name}
                              </Label>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCategoryName && (
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Subcategory</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-2"
                          >
                            {subcategories.map((sub) => (
                              <FormItem key={sub.id}>
                                <FormControl>
                                  <RadioGroupItem value={sub.name} id={`sub-${sub.id}`} className="sr-only peer" />
                                </FormControl>
                                <Label htmlFor={`sub-${sub.id}`} className={chipRadioClasses}>
                                  {sub.name}
                                </Label>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedSubcategoryName && microcategories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="microcategory"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Micro-Subcategory (Optional)</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-2"
                          >
                            {microcategories.map((micro) => (
                              <FormItem key={micro.id}>
                                <FormControl>
                                  <RadioGroupItem value={micro.name} id={`micro-${micro.id}`} className="sr-only peer" />
                                </FormControl>
                                <Label htmlFor={`micro-${micro.id}`} className={chipRadioClasses}>
                                  {micro.name}
                                </Label>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="paidBy"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Paid By</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2"
                        >
                          {paidByOptions.map((option) => (
                              <FormItem key={option}>
                                <FormControl>
                                  <RadioGroupItem value={option} id={`paidby-${option}`} className="sr-only peer" />
                                </FormControl>
                                <Label htmlFor={`paidby-${option}`} className={chipRadioClasses}>
                                  {option.toUpperCase()}
                                </Label>
                              </FormItem>
                          ))}
                        </RadioGroup>
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
                        <Input placeholder="Any additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-4 sticky bottom-0 bg-background">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Save Transaction'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
