
'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Transaction, Category, Subcategory } from './types';
import { categories as initialCategories } from './data';
import {
  Briefcase,
  Gift,
  HeartPulse,
  Home,
  Utensils,
  Car,
  Plane,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ShoppingBag,
  CircleDollarSign,
  Factory,
  HelpCircle,
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Gift,
  HeartPulse,
  Home,
  Utensils,
  Car,
  Plane,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ShoppingBag,
  CircleDollarSign,
  Factory,
  HelpCircle,
};

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (transactionId: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon'> & { icon: string }) => void;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id'>) => void;
  editCategory: (categoryId: string, category: Partial<Pick<Category, 'name' | 'icon'>>) => void;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => void;
  deleteCategory: (categoryId: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const q = query(collection(db, "transactions"), orderBy("date", "desc"), orderBy("time", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Error fetching transactions: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);


  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, "transactions"), transaction);
      setTransactions(prev => [{ ...transaction, id: docRef.id }, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const editTransaction = async (transactionId: string, transactionUpdate: Omit<Transaction, 'id'>) => {
    try {
        const transactionRef = doc(db, "transactions", transactionId);
        await updateDoc(transactionRef, transactionUpdate);
        setTransactions(prev => 
            prev.map(t => t.id === transactionId ? { id: transactionId, ...transactionUpdate } : t)
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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


  const addCategory = (category: Omit<Category, 'id' | 'subcategories' | 'icon'> & { icon: string }) => {
    const newCategory: Category = {
      ...category,
      id: category.name.toLowerCase().replace(/\s+/g, '_'),
      subcategories: [],
      icon: iconMap[category.icon] || HelpCircle,
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const addSubcategory = (categoryId: string, subcategory: Omit<Subcategory, 'id'>) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subcategories: [
                ...cat.subcategories,
                { ...subcategory, id: subcategory.name.toLowerCase().replace(/\s+/g, '_') },
              ],
            }
          : cat
      )
    );
  };
  
  const editCategory = (categoryId: string, categoryUpdate: Partial<Pick<Category, 'name' | 'icon'>>) => {
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id === categoryId) {
          const updatedCat = { ...cat, name: categoryUpdate.name || cat.name };
          if (typeof categoryUpdate.icon === 'string' && iconMap[categoryUpdate.icon]) {
            updatedCat.icon = iconMap[categoryUpdate.icon];
          }
          return updatedCat;
        }
        return cat;
      })
    );
  };

  const editSubcategory = (categoryId: string, subcategoryId: string, subcategoryUpdate: Pick<Subcategory, 'name'>) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subcategories: cat.subcategories.map(sub =>
                sub.id === subcategoryId
                  ? { ...sub, name: subcategoryUpdate.name }
                  : sub
              ),
            }
          : cat
      )
    );
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const deleteSubcategory = (categoryId: string, subcategoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subcategories: cat.subcategories.filter(sub => sub.id !== subcategoryId),
            }
          : cat
      )
    );
  };


  const contextValue = useMemo(() => ({
    transactions,
    categories,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addCategory,
    addSubcategory,
    editCategory,
    editSubcategory,
    deleteCategory,
    deleteSubcategory,
    loading,
  }), [transactions, categories, loading]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
