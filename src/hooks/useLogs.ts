'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AuditLog } from '@/lib/types';

export function useLogs(tenantId: string | null) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLogs([]);
      setLoadingLogs(false);
      return;
    }

    setLoadingLogs(true);
    const q = query(
      collection(db, 'logs'),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: AuditLog[] = [];
      snapshot.forEach(doc => {
        logsData.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      setLogs(logsData);
      setLoadingLogs(false);
    }, (error) => {
      console.error("Error fetching logs: ", error);
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  return { logs, loadingLogs };
}
