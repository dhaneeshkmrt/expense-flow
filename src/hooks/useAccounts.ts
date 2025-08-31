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
  getDocs,
  setDoc,
  getDoc,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { 
  VirtualAccount, 
  AccountTransaction, 
  MonthLock, 
  MonthEndProcessResult,
  Category,
  Transaction 
} from '@/lib/types';
import { format, parseISO } from 'date-fns';

export function useAccounts(tenantId: string | null) {
  const [accounts, setAccounts] = useState<VirtualAccount[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [monthLocks, setMonthLocks] = useState<MonthLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProcessing, setLoadingProcessing] = useState(false);

  // Listen to virtual accounts
  useEffect(() => {
    if (!tenantId) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const accountsQuery = query(
      collection(db, 'virtualAccounts'),
      where('tenantId', '==', tenantId),
      orderBy('categoryName', 'asc')
    );

    const unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData: VirtualAccount[] = [];
      snapshot.forEach((doc) => {
        accountsData.push({ id: doc.id, ...doc.data() } as VirtualAccount);
      });
      setAccounts(accountsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  // Listen to account transactions
  useEffect(() => {
    if (!tenantId) {
      setAccountTransactions([]);
      return;
    }

    const transactionsQuery = query(
      collection(db, 'accountTransactions'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData: AccountTransaction[] = [];
      snapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() } as AccountTransaction);
      });
      setAccountTransactions(transactionsData);
    });

    return () => unsubscribe();
  }, [tenantId]);

  // Listen to month locks
  useEffect(() => {
    if (!tenantId) {
      setMonthLocks([]);
      return;
    }

    const locksQuery = query(
      collection(db, 'monthLocks'),
      where('tenantId', '==', tenantId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc')
    );

    const unsubscribe = onSnapshot(locksQuery, (snapshot) => {
      const locksData: MonthLock[] = [];
      snapshot.forEach((doc) => {
        locksData.push({ id: doc.id, ...doc.data() } as MonthLock);
      });
      setMonthLocks(locksData);
    });

    return () => unsubscribe();
  }, [tenantId]);

  // Create or get virtual account for a category
  const createOrGetAccount = useCallback(async (categoryId: string, categoryName: string): Promise<VirtualAccount> => {
    if (!tenantId) throw new Error('No tenant selected');

    // Check if account already exists
    const existingAccount = accounts.find(acc => acc.categoryId === categoryId);
    if (existingAccount) return existingAccount;

    // Create new account
    const newAccount: Omit<VirtualAccount, 'id'> = {
      categoryId,
      categoryName,
      tenantId,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'virtualAccounts'), newAccount);
    return { id: docRef.id, ...newAccount };
  }, [tenantId, accounts]);

  // Add transaction to account
  const addAccountTransaction = useCallback(async (
    accountId: string,
    categoryId: string,
    amount: number,
    type: AccountTransaction['type'],
    description: string,
    monthYear: string
  ): Promise<void> => {
    if (!tenantId) throw new Error('No tenant selected');

    const transaction: Omit<AccountTransaction, 'id'> = {
      accountId,
      categoryId,
      tenantId,
      amount,
      type,
      description,
      monthYear,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Use batch to update both transaction and account balance
    const batch = writeBatch(db);
    
    // Add transaction
    const transactionRef = doc(collection(db, 'accountTransactions'));
    batch.set(transactionRef, transaction);

    // Update account balance
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      const accountRef = doc(db, 'virtualAccounts', accountId);
      batch.update(accountRef, {
        currentBalance: account.currentBalance + amount,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();
  }, [tenantId, accounts]);

  // Check if month is locked
  const isMonthLocked = useCallback((year: number, month: number): boolean => {
    return monthLocks.some(lock => lock.year === year && lock.month === month);
  }, [monthLocks]);

  // Lock a month
  const lockMonth = useCallback(async (year: number, month: number, lockedBy: string): Promise<void> => {
    if (!tenantId) throw new Error('No tenant selected');

    const lockId = `${tenantId}_${year}-${String(month + 1).padStart(2, '0')}`;
    const monthLock: MonthLock = {
      id: lockId,
      tenantId,
      year,
      month,
      lockedAt: new Date().toISOString(),
      lockedBy
    };

    await setDoc(doc(db, 'monthLocks', lockId), monthLock);
  }, [tenantId]);

  // Process month-end (main function)
  const processMonthEnd = useCallback(async (
    year: number,
    month: number,
    categories: Category[],
    transactions: Transaction[],
    lockedBy: string
  ): Promise<MonthEndProcessResult> => {
    if (!tenantId) throw new Error('No tenant selected');
    
    setLoadingProcessing(true);
    
    try {
      const result: MonthEndProcessResult = {
        processedCategories: [],
        totalSurplus: 0,
        transactionsCreated: 0,
        accountsCreated: 0
      };

      const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthName = format(new Date(year, month), 'MMM yyyy');

      // Calculate spending by category for the month
      const categorySpending = new Map<string, number>();
      transactions
        .filter(t => {
          const transactionDate = parseISO(t.date);
          return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
        })
        .forEach(t => {
          const current = categorySpending.get(t.category) || 0;
          categorySpending.set(t.category, current + t.amount);
        });

      // Process each category with budget
      for (const category of categories) {
        if (!category.budget || category.budget <= 0) continue;

        const spent = categorySpending.get(category.name) || 0;
        const surplus = Math.round((category.budget - spent) * 100) / 100;

        // Create or get account for all categories (even zero balance ones for tracking)
        const account = await createOrGetAccount(category.id, category.name);
        const isNewAccount = !accounts.some(acc => acc.id === account.id);
        if (isNewAccount) {
          result.accountsCreated++;
        }

        if (surplus > 0) {
          // Positive surplus - transfer to virtual account
          await addAccountTransaction(
            account.id,
            category.id,
            surplus,
            'surplus_transfer',
            `Month-end surplus from ${category.name} for ${monthName}`,
            monthYear
          );
        } else if (surplus < 0) {
          // Overspending - create negative balance in virtual account
          await addAccountTransaction(
            account.id,
            category.id,
            surplus, // Already negative
            'overspend_deficit',
            `Month-end overspend deficit from ${category.name} for ${monthName} (overspent by ${Math.abs(surplus)})`,
            monthYear
          );
        } else {
          // Zero balance - track for monitoring purposes
          await addAccountTransaction(
            account.id,
            category.id,
            0,
            'zero_balance',
            `Month-end zero balance from ${category.name} for ${monthName} (spent exactly budget amount)`,
            monthYear
          );
        }

        result.processedCategories.push({
          categoryId: category.id,
          categoryName: category.name,
          budget: category.budget,
          spent,
          surplus,
          accountId: account.id
        });

        result.totalSurplus += surplus; // This will be net (positive surplus minus negative deficit)
        result.transactionsCreated++;
      }

      // Lock the month
      await lockMonth(year, month, lockedBy);

      return result;
    } finally {
      setLoadingProcessing(false);
    }
  }, [tenantId, accounts, createOrGetAccount, addAccountTransaction, lockMonth]);

  // Get total balance across all accounts
  const getTotalBalance = useCallback((): number => {
    return accounts.reduce((total, account) => total + account.currentBalance, 0);
  }, [accounts]);

  // Get transactions for a specific account
  const getAccountTransactions = useCallback((accountId: string): AccountTransaction[] => {
    return accountTransactions.filter(t => t.accountId === accountId);
  }, [accountTransactions]);

  // Handle overspend withdrawal
  const handleOverspendWithdrawal = useCallback(async (
    categoryId: string,
    categoryName: string,
    overspendAmount: number,
    monthYear: string
  ): Promise<boolean> => {
    if (!tenantId) throw new Error('No tenant selected');

    // Find the account for this category
    const account = accounts.find(acc => acc.categoryId === categoryId);
    if (!account) {
      console.log(`No virtual account found for category ${categoryName}`);
      return false; // No account to withdraw from
    }

    if (account.currentBalance < overspendAmount) {
      console.log(`Insufficient balance in virtual account for ${categoryName}. Need: ${overspendAmount}, Available: ${account.currentBalance}`);
      return false; // Insufficient balance
    }

    // Create withdrawal transaction
    await addAccountTransaction(
      account.id,
      categoryId,
      -overspendAmount, // Negative amount for withdrawal
      'overspend_withdrawal',
      `Withdrawal to cover overspending in ${categoryName} for ${monthYear}`,
      monthYear
    );

    return true; // Withdrawal successful
  }, [tenantId, accounts, addAccountTransaction]);

  return {
    accounts,
    accountTransactions,
    monthLocks,
    loading,
    loadingProcessing,
    createOrGetAccount,
    addAccountTransaction,
    processMonthEnd,
    isMonthLocked,
    lockMonth,
    getTotalBalance,
    getAccountTransactions,
    handleOverspendWithdrawal
  };
}