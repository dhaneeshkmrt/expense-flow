'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Transaction, Category, Subcategory } from './types';
import { transactions as initialTransactions, categories as initialCategories } from './data';
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
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon'> & { icon: string }) => void;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id'>) => void;
  editCategory: (categoryId: string, category: Partial<Pick<Category, 'name' | 'icon'>>) => void;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => void;
  deleteCategory: (categoryId: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...transaction, id: `txn${Date.now()}` }, ...prev]);
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
    addCategory,
    addSubcategory,
    editCategory,
    editSubcategory,
    deleteCategory,
    deleteSubcategory,
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
