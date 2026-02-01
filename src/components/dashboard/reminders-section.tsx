'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '../ui/button';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { ReminderInstance } from '@/lib/types';
import { format } from 'date-fns';
import { Check, Edit, Loader2 } from 'lucide-react';
import { CompleteReminderDialog } from '../reminders/complete-reminder-dialog';
import { ReminderDialog } from '../reminders/reminder-dialog';

function ReminderItem({ instance, onComplete }: { instance: ReminderInstance, onComplete: (instance: ReminderInstance) => void }) {
    const formatCurrency = useCurrencyFormatter();
    
    return (
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
            <div className="flex-grow">
                <p className="font-medium">{instance.reminder.description}</p>
                <p className="text-sm text-muted-foreground">
                    Due: {format(instance.dueDate, 'MMM dd')} | {formatCurrency(instance.reminder.amount)}
                </p>
            </div>
            {!instance.isCompleted && (
                 <div className="flex items-center gap-1">
                    <Button size="sm" className="h-8" onClick={() => onComplete(instance)}>
                        <Check className="mr-1 h-4 w-4" />
                        Complete
                    </Button>
                </div>
            )}
            {instance.isCompleted && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Completed</span>
                </div>
            )}
        </div>
    )
}

export default function RemindersSection() {
  const { pendingReminders, completedReminders, loadingReminders } = useApp();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ReminderInstance | null>(null);
  const formatCurrency = useCurrencyFormatter();

  const handleCompleteClick = (instance: ReminderInstance) => {
    setSelectedInstance(instance);
    setCompleteDialogOpen(true);
  }

  const totalPendingAmount = useMemo(() => 
    pendingReminders.reduce((sum, inst) => sum + inst.reminder.amount, 0),
    [pendingReminders]
  );
  const totalCompletedAmount = useMemo(() =>
    completedReminders.reduce((sum, inst) => sum + inst.reminder.amount, 0),
    [completedReminders]
  );
  const totalReminders = pendingReminders.length + completedReminders.length;
  const totalRemindersAmount = totalPendingAmount + totalCompletedAmount;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Monthly Reminders</CardTitle>
          <CardDescription>
            {totalReminders > 0 ? (
                <>
                You have {totalReminders} reminders this month with a total value of {formatCurrency(totalRemindersAmount)}.
                Of this, {formatCurrency(totalPendingAmount)} is pending and {formatCurrency(totalCompletedAmount)} has been completed.
                </>
            ) : (
                "No reminders scheduled for this month."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending ({pendingReminders.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completedReminders.length})</TabsTrigger>
                </TabsList>
                {loadingReminders ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="pending" className="pt-2">
                            {pendingReminders.length > 0 ? (
                                <div className="space-y-1">
                                    {pendingReminders.map(inst => (
                                        <ReminderItem key={`${inst.reminder.id}-${inst.dueDate}`} instance={inst} onComplete={handleCompleteClick} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">All reminders are complete for this month!</p>
                            )}
                        </TabsContent>
                        <TabsContent value="completed" className="pt-2">
                            {completedReminders.length > 0 ? (
                                <div className="space-y-1">
                                    {completedReminders.map(inst => (
                                        <ReminderItem key={`${inst.reminder.id}-${inst.dueDate}`} instance={inst} onComplete={handleCompleteClick} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">No reminders completed this month yet.</p>
                            )}
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </CardContent>
      </Card>
      
      {selectedInstance && (
          <CompleteReminderDialog
            open={completeDialogOpen}
            setOpen={setCompleteDialogOpen}
            instance={selectedInstance}
          />
      )}
    </>
  );
}
