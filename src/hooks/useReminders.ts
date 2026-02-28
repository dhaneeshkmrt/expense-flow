'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Reminder, User } from '@/lib/types';
import { logChange } from '@/lib/logger';

export function useReminders(tenantId: string | null, user: User | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setReminders([]);
      setLoadingReminders(false);
      return;
    }

    setLoadingReminders(true);
    const q = query(
      collection(db, 'reminders'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remindersData: Reminder[] = [];
      snapshot.forEach(doc => {
        remindersData.push({ id: doc.id, ...doc.data() } as Reminder);
      });
      setReminders(remindersData.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      setLoadingReminders(false);
    }, (error) => {
      console.error("Error fetching reminders: ", error);
      setLoadingReminders(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const addReminder = async (reminderData: Omit<Reminder, 'id' | 'tenantId' | 'userId' | 'completedInstances'>) => {
    if (!tenantId || !user) throw new Error("User or tenant not available");

    const newReminderData = {
      ...reminderData,
      tenantId,
      userId: user.name,
      completedInstances: {},
    };
    const docRef = await addDoc(collection(db, 'reminders'), newReminderData);
    const newReminder = { id: docRef.id, ...newReminderData };
    await logChange(tenantId, user.name, 'CREATE', 'reminders', docRef.id, `Created reminder: ${newReminder.description}`, undefined, newReminder);
  };
  
  const editReminder = async (reminderId: string, reminderData: Partial<Omit<Reminder, 'id' | 'tenantId' | 'userId'>>) => {
    if (!tenantId || !user) return;
    const oldReminder = reminders.find(r => r.id === reminderId);
    const reminderRef = doc(db, 'reminders', reminderId);
    await updateDoc(reminderRef, reminderData);
    const updatedReminder = { ...oldReminder, ...reminderData } as Reminder;
    await logChange(tenantId, user.name, 'UPDATE', 'reminders', reminderId, `Updated reminder: ${updatedReminder.description}`, oldReminder, updatedReminder);
  };
  
  const deleteReminder = async (reminderId: string) => {
    if (!tenantId || !user) return;
    const reminderToDelete = reminders.find(r => r.id === reminderId);
    
    setReminders(prev => prev.filter(r => r.id !== reminderId));

    try {
      await deleteDoc(doc(db, 'reminders', reminderId));
      if (reminderToDelete) {
        await logChange(tenantId, user.name, 'DELETE', 'reminders', reminderId, `Deleted reminder: ${reminderToDelete.description}`, reminderToDelete, undefined);
      }
    } catch (error) {
      console.error("Error deleting reminder, reverting state:", error);
      if (reminderToDelete) {
          setReminders(prev => [...prev, reminderToDelete].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      }
    }
  };
  
  const completeReminderInstance = async (reminder: Reminder, dueDate: Date, transactionId: string) => {
    if (!tenantId || !user) return;
    const dueDateKey = dueDate.toISOString().split('T')[0];
    
    const updatedCompletedInstances = {
        ...reminder.completedInstances,
        [dueDateKey]: transactionId,
    };

    // Optimistic update
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completedInstances: updatedCompletedInstances } : r));

    try {
      const reminderRef = doc(db, 'reminders', reminder.id);
      await updateDoc(reminderRef, { completedInstances: updatedCompletedInstances });
      await logChange(tenantId, user.name, 'UPDATE', 'reminders', reminder.id, `Completed reminder instance for ${reminder.description} on ${dueDateKey}`, reminder, { ...reminder, completedInstances: updatedCompletedInstances });
    } catch (error) {
      console.error("Error completing reminder instance, reverting state:", error);
      // Revert local state on failure
      setReminders(prev => prev.map(r => r.id === reminder.id ? reminder : r));
      // CRITICAL: Re-throw the error so the UI can show a failure notification
      throw error;
    }
  };

  return {
    reminders,
    loadingReminders,
    addReminder,
    editReminder,
    deleteReminder,
    completeReminderInstance,
  };
}
