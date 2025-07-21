
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, doc, writeBatch, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction, User } from '@/lib/types';

const sortTransactions = (transactions: Transaction[]) => {
  return transactions.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
    const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
    return dateB - dateA;
  });
};

export function useTransactions(tenantId: string | null, user: User | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const fetchTransactions = useCallback(async (tenantIdToFetch: string) => {
    setLoadingTransactions(true);
    try {
      const q = query(collection(db, "transactions"), where("tenantId", "==", tenantIdToFetch));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(sortTransactions(fetchedTransactions));
    } catch (error) {
      console.error("Error fetching transactions: ", error);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    if (tenantId) {
      fetchTransactions(tenantId);
    } else {
      setTransactions([]);
      setLoadingTransactions(false);
    }
  }, [tenantId, fetchTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'tenantId'| 'userId'>) => {
    if (!tenantId) return;
    const transactionData = { ...transaction, tenantId: tenantId, userId: user?.name };
    try {
      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      setTransactions(prev => sortTransactions([...prev, { ...transactionData, id: docRef.id }]));
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };
  
  const addMultipleTransactions = async (transactionsToAdd: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]) => {
    if (!tenantId) throw new Error("Please select a tenant first.");
    const batch = writeBatch(db);
    const newTransactions: Transaction[] = [];

    transactionsToAdd.forEach(transaction => {
      const docRef = doc(collection(db, "transactions"));
      const transactionData = { ...transaction, tenantId: tenantId, userId: user?.name, microcategory: transaction.microcategory || '' };
      batch.set(docRef, transactionData);
      newTransactions.push({ ...transactionData, id: docRef.id });
    });

    try {
      await batch.commit();
      setTransactions(prev => sortTransactions([...prev, ...newTransactions]));
    } catch (e) {
      console.error("Error adding multiple documents: ", e);
      throw new Error("Failed to import transactions.");
    }
  };

  const editTransaction = async (transactionId: string, transactionUpdate: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => {
    if (!tenantId) return;
    const transactionData = { ...transactionUpdate, tenantId: tenantId, userId: user?.name };
    try {
        const transactionRef = doc(db, "transactions", transactionId);
        await updateDoc(transactionRef, transactionData);
        setTransactions(prev => 
            sortTransactions(prev.map(t => t.id === transactionId ? { id: transactionId, ...transactionData } : t))
        );
    } catch (e) {
        console.error("Error updating document: ", e);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
        await deleteDoc(doc(db, "transactions", transactionId));
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (e) {
        console.error("Error deleting document: ", e);
    }
  };

  return {
    transactions,
    loadingTransactions,
    addTransaction,
    addMultipleTransactions,
    editTransaction,
    deleteTransaction,
  };
}
