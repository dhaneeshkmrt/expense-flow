
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

    const newReminder = {
      ...reminderData,
      tenantId,
      userId: user.name,
      completedInstances: {},
    };
    await addDoc(collection(db, 'reminders'), newReminder);
  };
  
  const editReminder = async (reminderId: string, reminderData: Partial<Omit<Reminder, 'id' | 'tenantId' | 'userId'>>) => {
    const reminderRef = doc(db, 'reminders', reminderId);
    await updateDoc(reminderRef, reminderData);
  };
  
  const deleteReminder = async (reminderId: string) => {
    await deleteDoc(doc(db, 'reminders', reminderId));
  };
  
  const completeReminderInstance = async (reminder: Reminder, dueDate: Date, transactionId: string) => {
    const reminderRef = doc(db, 'reminders', reminder.id);
    const dueDateKey = dueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const updatedCompletedInstances = {
        ...reminder.completedInstances,
        [dueDateKey]: transactionId,
    };
    
    await updateDoc(reminderRef, { completedInstances: updatedCompletedInstances });
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
