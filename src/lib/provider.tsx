
'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import type { Transaction, Category, Subcategory, Microcategory, Settings, Tenant, User, BalanceSheet } from './types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
import { useSettings } from '@/hooks/useSettings';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { getYear, getMonth, parseISO, format } from 'date-fns';

interface CategoryTransferData {
    sourceCategoryId: string;
    destinationCategoryId: string;
    amount: number;
    notes?: string;
}

// Define the shape of the context value
interface AppContextType {
  user: User | null;
  signIn: (email: string, secretToken: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  
  tenants: Tenant[];
  selectedTenantId: string | null;
  setSelectedTenantId: (tenantId: string | null) => void;
  addTenant: (tenant: Partial<Omit<Tenant, 'id'>>) => Promise<void>;
  editTenant: (tenantId: string, tenant: Partial<Omit<Tenant, 'id'>>) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  isRootUser: boolean;
  isMainTenantUser: boolean;
  backupAllData: () => Promise<void>;
  restoreAllData: (data: any) => Promise<void>;
  
  settings: Settings;
  updateSettings: (newSettings: Partial<Omit<Settings, 'tenantId'>>) => Promise<void>;

  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'userId'> & { icon: string }) => Promise<void>;
  editCategory: (categoryId: string, category: { name?: string; icon?: string | React.ElementType; budget?: number; }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id' | 'microcategories'>) => Promise<void>;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  addMicrocategory: (categoryId: string, subcategoryId: string, microcategory: Omit<Microcategory, 'id'>) => Promise<void>;
  editMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string, microcategory: Pick<Microcategory, 'name'>) => Promise<void>;
  deleteMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string) => Promise<void>;
  
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  addMultipleTransactions: (transactions: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]) => Promise<void>;
  editTransaction: (transactionId: string, transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  
  handleCategoryTransfer: (data: CategoryTransferData) => Promise<void>;

  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  availableYears: number[];
  selectedMonthName: string;

  fetchBalanceSheet: (year: number, month: number) => Promise<BalanceSheet | null>;
  saveBalanceSheet: (year: number, month: number, data: Omit<BalanceSheet, 'id'|'year'|'month'|'tenantId'|'updatedAt'>) => Promise<BalanceSheet>;

  loading: boolean;
  loadingAuth: boolean;
  loadingCategories: boolean;
  loadingSettings: boolean;
  loadingTenants: boolean;
  loadingTransactions: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth, signIn, signOut, signInWithGoogle } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const { seedDefaultSettings } = useSettings(null);
  const { seedDefaultCategories } = useCategories(null); 

  const tenantHook = useTenants(seedDefaultCategories, seedDefaultSettings, user);
  const { selectedTenantId } = tenantHook;

  const settingsHook = useSettings(selectedTenantId);
  const categoriesHook = useCategories(selectedTenantId);
  const transactionsHook = useTransactions(selectedTenantId, user);

  
  const availableYears = useMemo(() => {
    const years = new Set(transactionsHook.transactions.map(t => getYear(parseISO(t.date))));
    if (!years.has(new Date().getFullYear())) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactionsHook.transactions]);

  const filteredTransactions = useMemo(() => {
    return transactionsHook.transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return getYear(transactionDate) === selectedYear && getMonth(transactionDate) === selectedMonth;
    });
  }, [transactionsHook.transactions, selectedYear, selectedMonth]);
  
  const selectedMonthName = useMemo(() => {
    return format(new Date(selectedYear, selectedMonth), 'MMMM');
  }, [selectedYear, selectedMonth]);

  const fetchBalanceSheet = useCallback(async (year: number, month: number): Promise<BalanceSheet | null> => {
    if (!selectedTenantId) return null;
    const docId = `${selectedTenantId}_${year}-${String(month + 1).padStart(2, '0')}`;
    const docRef = doc(db, 'balanceSheets', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as BalanceSheet;
    }
    return null;
  }, [selectedTenantId]);

  const saveBalanceSheet = useCallback(async (
    year: number,
    month: number,
    data: Omit<BalanceSheet, 'id'|'year'|'month'|'tenantId'|'updatedAt'>
  ): Promise<BalanceSheet> => {
    if (!selectedTenantId) throw new Error('No tenant selected');
    
    const docId = `${selectedTenantId}_${year}-${String(month + 1).padStart(2, '0')}`;
    const docRef = doc(db, 'balanceSheets', docId);

    const dataToSave: BalanceSheet = {
        ...data,
        id: docId,
        tenantId: selectedTenantId,
        year,
        month,
        updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  }, [selectedTenantId]);

  const handleCategoryTransfer = useCallback(async (data: CategoryTransferData) => {
    const { sourceCategoryId, destinationCategoryId, amount, notes } = data;
    const sourceCategory = categoriesHook.categories.find(c => c.id === sourceCategoryId);
    const destinationCategory = categoriesHook.categories.find(c => c.id === destinationCategoryId);
    const loanCategory = categoriesHook.categories.find(c => c.name === "Loan");

    if (!sourceCategory || !destinationCategory || !loanCategory) {
        throw new Error("Source, destination, or Loan category not found.");
    }

    const transferSubCategory = "Category Transfer";
    const date = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
    const time = format(new Date(), 'HH:mm');
    const defaultPaidBy = tenantHook.tenants.find(t => t.id === tenantHook.selectedTenantId)?.paidByOptions?.[0] || 'N/A';

    // Transaction 1: Debit from source category
    const debitTransaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'> = {
        date,
        time,
        description: `Transfer to ${destinationCategory.name}`,
        amount: amount,
        category: sourceCategory.name,
        subcategory: transferSubCategory,
        paidBy: defaultPaidBy,
        notes,
    };

    // Transaction 2: Credit to destination category (via Loan category)
    const creditTransaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'> = {
        date,
        time,
        description: `Transfer from ${sourceCategory.name}`,
        amount: -amount,
        category: loanCategory.name,
        subcategory: transferSubCategory,
        paidBy: defaultPaidBy,
        notes,
    };
    
    await transactionsHook.addMultipleTransactions([debitTransaction, creditTransaction]);

  }, [categoriesHook.categories, selectedYear, selectedMonth, tenantHook.tenants, tenantHook.selectedTenantId, transactionsHook.addMultipleTransactions]);

  const loading = loadingAuth || tenantHook.loadingTenants || settingsHook.loadingSettings || categoriesHook.loadingCategories || transactionsHook.loadingTransactions;

  const contextValue = useMemo(() => ({
    user,
    signIn,
    signOut,
    signInWithGoogle,

    ...tenantHook,
    ...settingsHook,
    ...categoriesHook,
    ...transactionsHook,

    handleCategoryTransfer,
    filteredTransactions,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    availableYears,
    selectedMonthName,

    fetchBalanceSheet,
    saveBalanceSheet,

    loading,
    loadingAuth,
    loadingCategories: categoriesHook.loadingCategories,
    loadingSettings: settingsHook.loadingSettings,
    loadingTenants: tenantHook.loadingTenants,
    loadingTransactions: transactionsHook.loadingTransactions,
  }), [user, signIn, signOut, signInWithGoogle, tenantHook, settingsHook, categoriesHook, transactionsHook, handleCategoryTransfer, loading, loadingAuth, filteredTransactions, selectedYear, selectedMonth, availableYears, selectedMonthName, fetchBalanceSheet, saveBalanceSheet]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
