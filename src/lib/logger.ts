import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AuditLog } from '@/lib/types';

export const logChange = async (
  tenantId: string | null,
  userId: string | null,
  operationType: AuditLog['operationType'],
  collectionName: string,
  docId: string,
  description: string,
  oldData?: any,
  newData?: any
) => {
  if (!tenantId || !userId) {
    console.warn('Cannot create audit log without tenantId and userId');
    return;
  }

  const logEntry: Omit<AuditLog, 'id'> = {
    tenantId,
    userId,
    timestamp: new Date().toISOString(),
    operationType,
    collectionName,
    docId,
    description,
    ...(oldData && { oldData: JSON.stringify(oldData, null, 2) }),
    ...(newData && { newData: JSON.stringify(newData, null, 2) }),
  };

  try {
    await addDoc(collection(db, 'logs'), logEntry);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
