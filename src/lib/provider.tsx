'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Transaction, Category } from './types';
import { transactions as initialTransactions, categories as initialCategories } from './data';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon'> & { icon: string }) => void;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...transaction, id: `txn${Date.now()}` }, ...prev]);
  };

  const addCategory = (category: Omit<Category, 'id' | 'subcategories' | 'icon'> & { icon: string }) => {
    // In a real app, you'd handle icon selection more robustly.
    // For now, we'll just add it without a real icon component.
    const newCategory: Category = {
      ...category,
      id: category.name.toLowerCase().replace(/\s+/g, '_'),
      subcategories: [],
      icon: () => <div />, 
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

  const contextValue = useMemo(() => ({
    transactions,
    categories,
    addTransaction,
    addCategory,
    addSubcategory,
  }), [transactions, categories]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
