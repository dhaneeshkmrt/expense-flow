'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const reminderSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  category: z.string().min(1, 'Please select a category.'),
  subcategory: z.string().min(1, 'Please select a subcategory.'),
  microcategory: z.string().optional(),
  paidBy: z.string().min(1, 'Please select a payer.'),
  notes: z.string().optional(),
  startDate: z.date(),
  frequency: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']),
  dayOfMonth: z.coerce.number().optional(),
  // dayOfWeek and weekOfMonth will be handled with custom validation
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

const weekDays = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
];

const weekOfMonthOptions = [
    { label: 'First', value: 1 },
    { label: 'Second', value: 2 },
    { label: 'Third', value: 3 },
    { label: 'Fourth', value: 4 },
    { label: 'Last', value: 5 },
];


export function ReminderDialog({ open, setOpen, reminderId }: { open: boolean, setOpen: (open: boolean) => void, reminderId: string | null }) {
  const { addReminder, editReminder, reminders, categories, userTenant } = useApp();
  const isEditing = !!reminderId;
  const reminder = useMemo(() => reminders.find(r => r.id === reminderId), [reminderId, reminders]);

  const [recurrenceType, setRecurrenceType] = useState<'day_of_month' | 'day_of_week'>('day_of_month');
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>();
  const [weekOfMonth, setWeekOfMonth] = useState<number | undefined>();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
  });

  const paidByOptions = useMemo(() => userTenant?.paidByOptions || [], [userTenant]);

  useEffect(() => {
    if (open) {
      if (isEditing && reminder) {
        form.reset({
          description: reminder.description,
          amount: reminder.amount,
          category: reminder.category,
          subcategory: reminder.subcategory,
          microcategory: reminder.microcategory,
          paidBy: reminder.paidBy,
          notes: reminder.notes,
          startDate: new Date(reminder.startDate),
          frequency: reminder.recurrence.frequency,
          dayOfMonth: reminder.recurrence.dayOfMonth,
        });
        if (reminder.recurrence.dayOfWeek !== undefined) {
            setRecurrenceType('day_of_week');
            setDayOfWeek(reminder.recurrence.dayOfWeek);
            setWeekOfMonth(reminder.recurrence.weekOfMonth);
        } else {
            setRecurrenceType('day_of_month');
        }
      } else {
        form.reset({
            description: '',
            amount: 0,
            category: '',
            subcategory: '',
            microcategory: '',
            paidBy: paidByOptions[0] || '',
            notes: '',
            startDate: new Date(),
            frequency: 'monthly',
            dayOfMonth: new Date().getDate(),
        });
        setRecurrenceType('day_of_month');
        setDayOfWeek(undefined);
        setWeekOfMonth(undefined);
      }
    }
  }, [open, isEditing, reminder, form, paidByOptions]);

  const watchedCategory = form.watch('category');
  const watchedSubcategory = form.watch('subcategory');
  
  const subcategoryOptions = useMemo(() => categories.find(c => c.name === watchedCategory)?.subcategories || [], [categories, watchedCategory]);
  const microcategoryOptions = useMemo(() => {
    const subcategory = subcategoryOptions.find(s => s.name === watchedSubcategory);
    return subcategory ? (subcategory.microcategories || []) : [];
  }, [subcategoryOptions, watchedSubcategory]);

  useEffect(() => {
    if (form.formState.isDirty) {
        form.setValue('subcategory', '');
        form.setValue('microcategory', '');
    }
  }, [watchedCategory, form.setValue, form.formState.isDirty]);

  useEffect(() => {
    if (form.formState.isDirty) {
        form.setValue('microcategory', '');
    }
  }, [watchedSubcategory, form.setValue, form.formState.isDirty]);
  
  const onSubmit = async (data: ReminderFormValues) => {
    const reminderData: any = {
        ...data,
        startDate: data.startDate.toISOString(),
        recurrence: {
            frequency: data.frequency,
        },
    };

    if (data.frequency !== 'one-time') {
        if(recurrenceType === 'day_of_month') {
            reminderData.recurrence.dayOfMonth = data.dayOfMonth;
        } else {
            reminderData.recurrence.dayOfWeek = dayOfWeek;
            reminderData.recurrence.weekOfMonth = weekOfMonth;
        }
    }
    
    delete reminderData.dayOfMonth;

    try {
        if (isEditing) {
            await editReminder(reminderId!, reminderData);
            toast({ title: "Reminder Updated" });
        } else {
            await addReminder(reminderData);
            toast({ title: "Reminder Added" });
        }
        setOpen(false);
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: 'destructive' });
    }
  };

  const frequency = form.watch('frequency');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            {/* Transaction Details */}
            <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField name="amount" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField name="category" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category..."/></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <FormField name="subcategory" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Subcategory</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCategory}><FormControl><SelectTrigger><SelectValue placeholder="Select subcategory..."/></SelectTrigger></FormControl><SelectContent>{subcategoryOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
             {microcategoryOptions.length > 0 && (
                 <FormField name="microcategory" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Micro-category (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select micro-category..."/></SelectTrigger></FormControl><SelectContent>{microcategoryOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
            )}
            <FormField name="paidBy" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Paid By</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select payer..."/></SelectTrigger></FormControl><SelectContent>{paidByOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            
            {/* Recurrence Rules */}
            <h3 className="font-semibold pt-2">Recurrence</h3>
            <FormField name="startDate" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('w-full', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a start date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                <FormMessage /></FormItem>
            )}/>
            <FormField name="frequency" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent></Select><FormMessage /></FormItem>
            )}/>
            
            {frequency !== 'one-time' && (
                <>
                <Select onValueChange={(v: 'day_of_month' | 'day_of_week') => setRecurrenceType(v)} value={recurrenceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day_of_month">On a specific day of the month</SelectItem>
                        <SelectItem value="day_of_week">On a specific day of the week</SelectItem>
                    </SelectContent>
                </Select>
                
                {recurrenceType === 'day_of_month' && (
                    <FormField name="dayOfMonth" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Day of Month</FormLabel><FormControl><Input type="number" min={1} max={31} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                )}
                
                {recurrenceType === 'day_of_week' && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormItem><FormLabel>Week of Month</FormLabel><Select onValueChange={(v) => setWeekOfMonth(Number(v))} value={String(weekOfMonth)}><SelectTrigger><SelectValue placeholder="Select week..."/></SelectTrigger><SelectContent>{weekOfMonthOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select></FormItem>
                        <FormItem><FormLabel>Day of Week</FormLabel><Select onValueChange={(v) => setDayOfWeek(Number(v))} value={String(dayOfWeek)}><SelectTrigger><SelectValue placeholder="Select day..."/></SelectTrigger><SelectContent>{weekDays.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent></Select></FormItem>
                    </div>
                )}
                </>
            )}

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save Reminder</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
