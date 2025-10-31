
'use client';

import { useState, useMemo, useEffect, useTransition, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
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
import { CalendarIcon, Loader2, Lock, Plus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, getYear, getMonth, subDays } from 'date-fns';
import { useApp } from '@/lib/provider';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { suggestTransactionCategories } from '@/ai/flows/categorize-transaction';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Transaction } from '@/lib/types';
import { useCurrencyInput } from '@/hooks/useCurrencyInput';

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
  const { categories, addTransaction, editTransaction, tenants, selectedTenantId, isMonthLocked, settings } = useApp();
  const { toast } = useToast();
  const [isAiPending, startAiTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!transaction;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  
  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId);
  }, [tenants, selectedTenantId]);

  const paidByOptions = useMemo(() => {
    return selectedTenant?.paidByOptions || [];
  }, [selectedTenant]);
  
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
        amount: undefined,
        category: '',
        subcategory: '',
        microcategory: '',
        paidBy: '',
        notes: '',
    },
  });
  
  const onValueChange = useCallback((value: number) => {
    form.setValue('amount', value, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const {
    inputRef,
    formattedValue,
    handleInputChange,
    handleBlur,
    calculationResult,
    setValue,
    amountInWords,
  } = useCurrencyInput({
    onValueChange,
  });

  // Check if the selected date is in a locked month
  const selectedDate = form.watch('date');
  const isSelectedMonthLocked = useMemo(() => {
    if (!selectedDate) return false;
    const year = getYear(selectedDate);
    const month = getMonth(selectedDate);
    return isMonthLocked(year, month);
  }, [selectedDate, isMonthLocked]);

  const lockedMonthMessage = useMemo(() => {
    if (!isSelectedMonthLocked || !selectedDate) return null;
    return `This month (${format(selectedDate, 'MMMM yyyy')}) is locked after month-end processing. Please select a different date.`;
  }, [isSelectedMonthLocked, selectedDate]);

  useEffect(() => {
    if (open) {
      if (isEditing && transaction) {
        form.reset({
          ...transaction,
          date: parseISO(transaction.date),
          amount: transaction.amount,
          microcategory: transaction.microcategory || '',
          notes: transaction.notes || '',
        });
        setValue(String(transaction.amount));
      } else {
         form.reset({
            date: new Date(),
            time: format(new Date(), 'HH:mm'),
            description: '',
            amount: undefined,
            category: '',
            subcategory: '',
            microcategory: '',
            paidBy: paidByOptions[0] || '',
            notes: '',
        });
        setValue(''); // Reset currency input
        inputRef.current?.focus();
      }
    }
  }, [open, isEditing, transaction, paidByOptions, form, setValue, inputRef]);

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

  const handleSave = async (data: TransactionFormValues, shouldClose: boolean) => {
    setIsSubmitting(true);
    const submissionData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
        microcategory: data.microcategory || '',
    };
    
    try {
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

      if (shouldClose) {
        form.reset();
        setOpen(false);
      } else {
        // Reset form but keep date and time
        const { date, time, paidBy } = form.getValues();
        form.reset({
          date,
          time,
          paidBy,
          description: '',
          amount: undefined,
          category: '',
          subcategory: '',
          microcategory: '',
          notes: '',
        });
        setValue('');
        inputRef.current?.focus();
      }
    } catch(error: any) {
        toast({
          title: 'Save Failed',
          description: error.message || "There was an error saving the transaction.",
          variant: 'destructive',
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetTitle = isEditing ? 'Edit Transaction' : 'Add a New Transaction';
    
  const chipRadioClasses = "cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="w-full sm:max-w-xl flex flex-col" suppressHydrationWarning>
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>
        
        {lockedMonthMessage && (
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              {lockedMonthMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-6 py-4">
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          ref={inputRef}
                          type="text" 
                          placeholder="0.00 or 50+25" 
                          value={formattedValue}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                         />
                      </FormControl>
                      {calculationResult && (
                        <div className="text-xs text-muted-foreground pt-1">
                          = {calculationResult}
                        </div>
                      )}
                      {amountInWords && (
                        <div className="text-xs text-muted-foreground pt-1 font-medium italic">
                          {amountInWords}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Date</FormLabel>
                        {settings.dateInputStyle === 'popup' ? (
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
                        ) : (
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            className="rounded-md border"
                          />
                        )}
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
              <SheetFooter className="pt-4">
                <Button 
                  type="button" 
                  onClick={form.handleSubmit((data) => handleSave(data, true))}
                  disabled={isSubmitting || isSelectedMonthLocked} 
                  className="w-full"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Save Transaction'}
                </Button>
                {!isEditing && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={form.handleSubmit((data) => handleSave(data, false))}
                    disabled={isSubmitting || isSelectedMonthLocked} 
                    className="w-full"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     <Plus className="mr-2 h-4 w-4" />
                     Save & New
                  </Button>
                )}
              </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
