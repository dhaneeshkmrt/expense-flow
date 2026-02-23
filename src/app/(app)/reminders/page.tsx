'use client';
import { useState } from 'react';
import { useApp } from '@/lib/provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { ReminderDialog } from '@/components/reminders/reminder-dialog';
import { ReminderList } from '@/components/reminders/reminders-list';
import { CompleteReminderDialog } from '@/components/reminders/complete-reminder-dialog';
import type { ReminderInstance } from '@/lib/types';

export default function RemindersPage() {
    const { reminders, loadingReminders, deleteReminder, pendingReminders } = useApp();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);

    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<ReminderInstance | null>(null);

    const handleAdd = () => {
        setSelectedReminderId(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (reminderId: string) => {
        setSelectedReminderId(reminderId);
        setIsDialogOpen(true);
    };

    const handleComplete = (instance: ReminderInstance) => {
        setSelectedInstance(instance);
        setCompleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Reminders</h1>
                    <p className="text-muted-foreground">Manage your recurring and future transactions.</p>
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Reminder
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Reminder Series</CardTitle>
                    <CardDescription>This is a list of all your reminder rules. Pending items for the current month are shown on the dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingReminders ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ReminderList 
                            reminders={reminders} 
                            onEdit={handleEdit}
                            onDelete={deleteReminder}
                            pendingReminders={pendingReminders}
                            onComplete={handleComplete}
                        />
                    )}
                </CardContent>
            </Card>

            <ReminderDialog
                open={isDialogOpen}
                setOpen={setIsDialogOpen}
                reminderId={selectedReminderId}
            />

            {selectedInstance && (
                <CompleteReminderDialog
                    open={completeDialogOpen}
                    setOpen={setCompleteDialogOpen}
                    instance={selectedInstance}
                />
            )}
        </div>
    );
}
