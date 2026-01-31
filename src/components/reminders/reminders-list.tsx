
'use client';
import { useApp } from '@/lib/provider';
import type { Reminder, ReminderInstance } from '@/lib/types';
import { Button } from '../ui/button';
import { Edit, Trash2, Check } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format, parseISO } from 'date-fns';
import { getFriendlyRecurrence } from '@/lib/reminder-utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

interface ReminderListProps {
  reminders: Reminder[];
  pendingReminders: ReminderInstance[];
  onEdit: (reminderId: string) => void;
  onDelete: (reminderId: string) => void;
  onComplete: (instance: ReminderInstance) => void;
}

export function ReminderList({ reminders, pendingReminders, onEdit, onDelete, onComplete }: ReminderListProps) {
  const { categories } = useApp();
  const formatCurrency = useCurrencyFormatter();

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category && typeof category.icon !== 'string') {
        const Icon = category.icon;
        return <Icon className="w-5 h-5 text-muted-foreground" />;
    }
    return null;
  };
  
  if (reminders.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No reminders created yet.</p>;
  }

  return (
    <div className="space-y-4">
      {reminders.map(reminder => {
        const nextInstance = pendingReminders.find(inst => inst.reminder.id === reminder.id);
        
        return (
            <div key={reminder.id} className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="p-2 bg-secondary rounded-md">
                {getCategoryIcon(reminder.category)}
            </div>
            <div className="flex-grow">
                <p className="font-semibold">{reminder.description}</p>
                <p className="text-sm text-muted-foreground">
                {formatCurrency(reminder.amount)} | {reminder.category} / {reminder.subcategory}
                </p>
                <p className="text-xs text-muted-foreground">
                {getFriendlyRecurrence(reminder.recurrence)} starting from {format(parseISO(reminder.startDate), 'MMM dd, yyyy')}
                </p>
            </div>
            <div className="flex items-center gap-1">
                {nextInstance && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => onComplete(nextInstance)}>
                        <Check className="mr-1 h-4 w-4" />
                        Complete
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(reminder.id)}>
                <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will permanently delete the reminder series for "{reminder.description}". This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(reminder.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            </div>
        )})}
    </div>
  );
}
