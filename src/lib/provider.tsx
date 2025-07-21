
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import type { Transaction, Category, Subcategory, Microcategory, Settings, Tenant, User } from './types';

import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
import { useSettings } from '@/hooks/useSettings';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';

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
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'userId' | 'budgets'> & { icon: string, budget?: number }) => Promise<void>;
  editCategory: (categoryId: string, category: { name?: string; icon?: string | React.ElementType; budget?: number; }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategoryBudget: (categoryId: string, month: string, budget: number) => Promise<void>;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id' | 'microcategories'>) => Promise<void>;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  addMicrocategory: (categoryId: string, subcategoryId: string, microcategory: Omit<Microcategory, 'id'>) => Promise<void>;
  editMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string, microcategory: Pick<Microcategory, 'name'>) => Promise<void>;
  deleteMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string) => Promise<void>;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  addMultipleTransactions: (transactions: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]) => Promise<void>;
  editTransaction: (transactionId: string, transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  
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
  
  // These hooks are just for getting the seeding functions
  const { seedDefaultSettings } = useSettings(null);
  const { seedDefaultCategories } = useCategories(null); 

  const tenantHook = useTenants(seedDefaultCategories, seedDefaultSettings, user);
  const { selectedTenantId } = tenantHook;

  const settingsHook = useSettings(selectedTenantId);
  const categoriesHook = useCategories(selectedTenantId);
  const transactionsHook = useTransactions(selectedTenantId, user);
  
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

    loading,
    loadingAuth,
    loadingCategories: categoriesHook.loadingCategories,
    loadingSettings: settingsHook.loadingSettings,
    loadingTenants: tenantHook.loadingTenants,
    loadingTransactions: transactionsHook.loadingTransactions,
  }), [user, signIn, signOut, signInWithGoogle, tenantHook, settingsHook, categoriesHook, transactionsHook, loading, loadingAuth]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
