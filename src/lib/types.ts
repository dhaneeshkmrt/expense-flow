
'use client';
import type { ElementType } from 'react';

export type FeatureAccess = {
  balanceSheet?: boolean;
  virtualAccounts?: boolean;
  yearlyReport?: boolean;
  aiImageStudio?: boolean;
  calculators?: boolean;
  admin?: boolean;
};

export type Microcategory = {
  id: string;
  name: string;
};

export type Subcategory = {
  id: string;
  name: string;
  microcategories: Microcategory[];
};

export type Category = {
  id: string;
  name: string;
  icon: ElementType | string;
  subcategories: Subcategory[];
  tenantId: string;
  userId?: string;
  isDefault?: boolean;
  budget: number; // This now represents the budget for the currently selected month
};

export type Transaction = {
  id:string;
  date: string;
  time: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  microcategory?: string;
  paidBy: string;
  notes?: string;
  tenantId: string;
  userId?: string;
};

export type Settings = {
  currency: string;
  locale: string;
  tenantId: string;
  dateInputStyle?: 'popup' | 'inline';
};

export type TenantMember = {
  name: string;
  email: string;
  mobileNo?: string;
  secretToken: string;
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  mobileNo?: string;
  address?: string;
  secretToken: string;
  members?: TenantMember[];
  paidByOptions?: string[];
  featureAccess?: FeatureAccess;
};

export type User = {
  name: string;
  tenantId: string;
};

export type BalanceSheetAccount = {
  categoryId: string;
  categoryName: string;
  budget: number;
  spent: number;
  balance: number;
};

export type BalanceSheetPaidBy = {
  name: string;
  amount: number;
};

export type BalanceSheet = {
  id: string; // e.g., tenantId_2024-07
  tenantId: string;
  year: number;
  month: number;
  totalBudget: number;
  totalSpent: number;
  balance: number;
  accountData: BalanceSheetAccount[];
  paidByData: BalanceSheetPaidBy[];
  updatedAt: string; // ISO string
};

// Virtual Banking System Types
export type VirtualAccount = {
  id: string;
  categoryId: string;
  categoryName: string;
  tenantId: string;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
};

export type AccountTransactionType = 'surplus_transfer' | 'overspend_withdrawal' | 'overspend_deficit' | 'zero_balance';

export type AccountTransaction = {
  id: string;
  accountId: string;
  categoryId: string;
  tenantId: string;
  amount: number; // positive for deposits, negative for withdrawals
  type: AccountTransactionType;
  description: string; // "Month-end surplus from Food for Dec 2024"
  monthYear: string; // "2024-12"
  date: string;
  createdAt: string;
};

export type MonthLock = {
  id: string; // format: tenantId_2024-12
  tenantId: string;
  year: number;
  month: number;
  lockedAt: string;
  lockedBy: string;
};

// Month-end processing result
export type MonthEndProcessResult = {
  processedCategories: {
    categoryId: string;
    categoryName: string;
    budget: number;
    spent: number;
    surplus: number;
    accountId: string;
  }[];
  totalSurplus: number;
  transactionsCreated: number;
  accountsCreated: number;
};

export type CategoryBudget = {
  budgets: { [monthKey: string]: { [categoryId: string]: number } };
};
