'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, Category, Subcategory, Microcategory, Settings, Tenant, TenantMember, User } from './types';
import { categories as defaultCategories, defaultSettings } from './data';
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
  Apple,
  Building,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, writeBatch, deleteDoc, updateDoc, query, orderBy, setDoc, getDoc, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { redirect, usePathname, useRouter } from 'next/navigation';

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
  Apple,
  Building,
  User: UserIcon,
  Calendar,
};

const getIconName = (iconComponent: React.ElementType) => {
    const iconEntry = Object.entries(iconMap).find(([, val]) => val === iconComponent);
    return iconEntry ? iconEntry[0] : 'HelpCircle';
}

const getIconComponent = (iconName: string): React.ElementType => {
    return iconMap[iconName] || HelpCircle;
};

type EditCategoryData = {
    name?: string;
    icon?: string | React.ElementType;
    budget?: number;
};


interface AppContextType {
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  tenants: Tenant[];
  selectedTenantId: string | null;
  setSelectedTenantId: (tenantId: string | null) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  addMultipleTransactions: (transactions: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]) => Promise<void>;
  editTransaction: (transactionId: string, transaction: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'userId' | 'budgets'> & { icon: string, budget?: number }) => Promise<void>;
  editCategory: (categoryId: string, category: EditCategoryData) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id' | 'microcategories'>) => Promise<void>;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  addMicrocategory: (categoryId: string, subcategoryId: string, microcategory: Omit<Microcategory, 'id'>) => Promise<void>;
  editMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string, microcategory: Pick<Microcategory, 'name'>) => Promise<void>;
  deleteMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<Omit<Settings, 'tenantId'>>) => Promise<void>;
  addTenant: (tenant: Omit<Tenant, 'id'>) => Promise<void>;
  editTenant: (tenantId: string, tenant: Partial<Omit<Tenant, 'id'>>) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  loading: boolean;
  loadingCategories: boolean;
  loadingSettings: boolean;
  loadingTenants: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, tenantId: '' });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  const loading = loadingTransactions || loadingCategories || loadingSettings || loadingTenants || !authInitialized;

  const router = useRouter();
  const pathname = usePathname();

  const seedDefaultCategories = useCallback(async (tenantId: string) => {
    const batch = writeBatch(db);
    defaultCategories.forEach((category) => {
        const categoryIdName = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const docRef = doc(db, 'categories', `${tenantId}_${categoryIdName}`);
        const categoryForDb = {
            ...category,
            tenantId: tenantId,
            icon: getIconName(category.icon),
            subcategories: category.subcategories.map(sub => ({...sub, microcategories: sub.microcategories || []})),
            budgets: {},
        };
        batch.set(docRef, categoryForDb);
    });
    await batch.commit();
  }, []);

  const seedDefaultSettings = useCallback(async (tenantId: string) => {
    const settingsRef = doc(db, 'settings', tenantId);
    const newSettings = { ...defaultSettings, tenantId };
    await setDoc(settingsRef, newSettings);
    return newSettings;
  }, []);
  
  const fetchTenants = useCallback(async (userId: string) => {
    setLoadingTenants(true);
    try {
        const tenantsCollection = collection(db, "tenants");
        const q = query(tenantsCollection, where("userId", "==", userId), orderBy("name"));
        const querySnapshot = await getDocs(q);
        let fetchedTenants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

        if (fetchedTenants.length === 0) {
            const defaultTenantData = {
                name: 'dhanisha',
                mobileNo: '',
                address: '',
                members: [],
                userId
            };
            const docRef = await addDoc(tenantsCollection, defaultTenantData);
            const defaultTenant = { id: docRef.id, ...defaultTenantData };
            fetchedTenants = [defaultTenant];
            await seedDefaultCategories(defaultTenant.id);
            await seedDefaultSettings(defaultTenant.id);
        }

        setTenants(fetchedTenants);
        if (fetchedTenants.length > 0) {
            const savedTenantId = localStorage.getItem('selectedTenantId');
            if (savedTenantId && fetchedTenants.some(t => t.id === savedTenantId)) {
                setSelectedTenantId(savedTenantId);
            } else {
                setSelectedTenantId(fetchedTenants[0].id);
            }
        }
    } catch (error) {
        console.error("Error fetching tenants: ", error);
    } finally {
        setLoadingTenants(false);
    }
}, [seedDefaultCategories, seedDefaultSettings]);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchTenants(parsedUser.id);
      } else if (pathname !== '/login') {
        router.push('/login');
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      sessionStorage.removeItem('user');
      router.push('/login');
    } finally {
        setAuthInitialized(true);
    }
  }, [pathname, router, fetchTenants]);

  const fetchTenantData = useCallback(async (tenantId: string) => {
    setLoadingTransactions(true);
    setLoadingCategories(true);
    setLoadingSettings(true);

    // Fetch Transactions
    try {
      const tq = query(collection(db, "transactions"), where("tenantId", "==", tenantId), orderBy("date", "desc"));
      const tQuerySnapshot = await getDocs(tq);
      const fetchedTransactions = tQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setAllTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions: ", error);
    } finally {
      setLoadingTransactions(false);
    }

    // Fetch Categories
    try {
      const cq = query(collection(db, 'categories'), where("tenantId", "==", tenantId));
      let cQuerySnapshot = await getDocs(cq);

      if (cQuerySnapshot.empty) {
        await seedDefaultCategories(tenantId);
        cQuerySnapshot = await getDocs(cq);
      }
      
      const fetchedCategories = cQuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          icon: getIconComponent(data.icon),
          subcategories: (data.subcategories || []).map((sub: any) => ({
            ...sub,
            microcategories: sub.microcategories || []
          })),
          tenantId: data.tenantId,
          budgets: data.budgets || {},
        } as Category;
      });
      setAllCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories: ", error);
    } finally {
      setLoadingCategories(false);
    }

    // Fetch Settings
    try {
      const settingsRef = doc(db, 'settings', tenantId);
      const docSnap = await getDoc(settingsRef);
      if (!docSnap.exists()) {
        const newSettings = await seedDefaultSettings(tenantId);
        setSettings(newSettings);
      } else {
        setSettings(docSnap.data() as Settings);
      }
    } catch (error) {
      console.error("Error fetching settings: ", error);
    } finally {
      setLoadingSettings(false);
    }
  }, [seedDefaultCategories, seedDefaultSettings]);


  useEffect(() => {
    if (selectedTenantId) {
      localStorage.setItem('selectedTenantId', selectedTenantId);
      fetchTenantData(selectedTenantId);
    } else {
        setAllTransactions([]);
        setAllCategories([]);
        setSettings({ ...defaultSettings, tenantId: ''});
        setLoadingTransactions(false);
        setLoadingCategories(false);
        setLoadingSettings(false);
    }
  }, [selectedTenantId, fetchTenantData]);


  const findCategory = (categoryId: string) => {
      const category = allCategories.find(c => c.id === categoryId);
      if (!category) throw new Error(`Category with id ${categoryId} not found`);
      return category;
  }

  const updateCategoryInDb = async (categoryId: string, updatedCategory: Category) => {
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryForDb = {
        ...updatedCategory,
        icon: typeof updatedCategory.icon === 'string' ? updatedCategory.icon : getIconName(updatedCategory.icon),
    };
    // @ts-ignore
    delete categoryForDb.id;
    await updateDoc(categoryRef, categoryForDb);
  }

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'tenantId'| 'userId'>) => {
    if (!selectedTenantId || !user) {
        alert("Please select a tenant and be logged in.");
        return;
    }
    const transactionData = { ...transaction, tenantId: selectedTenantId, userId: user.id };
    try {
      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      setAllTransactions(prev => [{ ...transactionData, id: docRef.id }, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };
  
  const addMultipleTransactions = async (transactions: Omit<Transaction, 'id' | 'tenantId' | 'userId'>[]) => {
    if (!selectedTenantId || !user) {
      throw new Error("Please select a tenant and be logged in.");
    }
    const batch = writeBatch(db);
    const newTransactions: Transaction[] = [];

    transactions.forEach(transaction => {
      const docRef = doc(collection(db, "transactions"));
      const transactionData = { ...transaction, tenantId: selectedTenantId, userId: user.id };
      batch.set(docRef, transactionData);
      newTransactions.push({ ...transactionData, id: docRef.id });
    });

    try {
      await batch.commit();
      setAllTransactions(prev => [...newTransactions, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error adding multiple documents: ", e);
      throw new Error("Failed to import transactions.");
    }
  };

  const editTransaction = async (transactionId: string, transactionUpdate: Omit<Transaction, 'id' | 'tenantId' | 'userId'>) => {
    if (!selectedTenantId || !user) return;
    const transactionData = { ...transactionUpdate, tenantId: selectedTenantId, userId: user.id };
    try {
        const transactionRef = doc(db, "transactions", transactionId);
        await updateDoc(transactionRef, transactionData);
        setAllTransactions(prev => 
            prev.map(t => t.id === transactionId ? { id: transactionId, ...transactionData } : t)
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
    } catch (e) {
        console.error("Error updating document: ", e);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
        await deleteDoc(doc(db, "transactions", transactionId));
        setAllTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (e) {
        console.error("Error deleting document: ", e);
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'userId' | 'budgets'> & { icon: string, budget?: number }) => {
    if (!selectedTenantId) {
        alert("Please select a tenant first.");
        return;
    }
    const id = `${selectedTenantId}_${categoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const currentMonthKey = format(new Date(), 'yyyy-MM');

    const newCategoryForState: Category = {
      id,
      name: categoryData.name,
      icon: getIconComponent(categoryData.icon),
      subcategories: [],
      tenantId: selectedTenantId,
      budgets: categoryData.budget ? { [currentMonthKey]: categoryData.budget } : {},
    };

    const categoryForDb = {
        name: categoryData.name,
        icon: categoryData.icon,
        subcategories: [],
        tenantId: selectedTenantId,
        budgets: categoryData.budget ? { [currentMonthKey]: categoryData.budget } : {},
    }

    const docRef = doc(db, 'categories', id);
    await setDoc(docRef, categoryForDb);
    setAllTransactions(prev => prev.map(t => t.category === categoryData.name ? { ...t, category: id } : t));
    setAllCategories(prev => [...prev, newCategoryForState]);
  };

  const editCategory = async (categoryId: string, categoryUpdate: EditCategoryData) => {
    const categoryRef = doc(db, 'categories', categoryId);
    const dbUpdate: { [key: string]: any } = {};

    if (categoryUpdate.name) dbUpdate.name = categoryUpdate.name;
    if (typeof categoryUpdate.icon === 'string') {
        dbUpdate.icon = categoryUpdate.icon;
    } else if (categoryUpdate.icon) {
        dbUpdate.icon = getIconName(categoryUpdate.icon);
    }
    
    if (categoryUpdate.budget !== undefined) {
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        dbUpdate[`budgets.${currentMonthKey}`] = categoryUpdate.budget;
    }
    
    if (Object.keys(dbUpdate).length > 0) {
        await updateDoc(categoryRef, dbUpdate);
    }
    
    setAllCategories(prev => prev.map(c => {
        if (c.id === categoryId) {
            const updatedCat = { ...c };
            if (categoryUpdate.name) updatedCat.name = categoryUpdate.name;
            if (categoryUpdate.icon && typeof categoryUpdate.icon === 'string') {
                updatedCat.icon = getIconComponent(categoryUpdate.icon);
            } else if (categoryUpdate.icon) {
                updatedCat.icon = categoryUpdate.icon;
            }
            if (categoryUpdate.budget !== undefined) {
                const currentMonthKey = format(new Date(), 'yyyy-MM');
                updatedCat.budgets = {
                    ...(updatedCat.budgets || {}),
                    [currentMonthKey]: categoryUpdate.budget,
                };
            }
            return updatedCat;
        }
        return c;
    }));
  };
  
  const deleteCategory = async (categoryId: string) => {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    setAllCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };
  
  const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'>) => {
    const category = findCategory(categoryId);
    const id = `${categoryId}_${subcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [] };

    const updatedCategory = {
        ...category,
        subcategories: [...category.subcategories, newSubcategory]
    };

    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };
  
  const editSubcategory = async (categoryId: string, subcategoryId: string, subcategoryUpdate: Pick<Subcategory, 'name'>) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub =>
            sub.id === subcategoryId ? { ...sub, name: subcategoryUpdate.name } : sub
        )
    };
    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId)
    };
    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };
  
  const addMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryData: Omit<Microcategory, 'id'>) => {
    const category = findCategory(categoryId);
    const id = `${subcategoryId}_${microcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const newMicrocategory: Microcategory = { ...microcategoryData, id };

    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
                return { ...sub, microcategories: [...(sub.microcategories || []), newMicrocategory] };
            }
            return sub;
        })
    };
    
    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };
  
  const editMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string, microcategoryUpdate: Pick<Microcategory, 'name'>) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
                return { ...sub, microcategories: (sub.microcategories || []).map(micro => micro.id === microcategoryId ? { ...micro, name: microcategoryUpdate.name } : micro) };
            }
            return sub;
        })
    };
    
    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const deleteMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
                return { ...sub, microcategories: (sub.microcategories || []).filter(micro => micro.id !== microcategoryId) };
            }
            return sub;
        })
    };
    
    await updateCategoryInDb(categoryId, updatedCategory);
    setAllCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const updateSettings = async (newSettings: Partial<Omit<Settings, 'tenantId'>>) => {
      if (!selectedTenantId) return;
      try {
          const settingsRef = doc(db, 'settings', selectedTenantId);
          await setDoc(settingsRef, newSettings, { merge: true });
          setSettings(prev => ({...prev, ...newSettings}));
      } catch (error) {
          console.error("Error updating settings: ", error);
      }
  };

  const addTenant = async (tenantData: Omit<Tenant, 'id'>) => {
    if (!user) {
        alert("You must be logged in to add a tenant.");
        return;
    }
    const tenantPayload = { ...tenantData, userId: user.id };
    try {
        const docRef = await addDoc(collection(db, 'tenants'), tenantPayload);
        const newTenant = { id: docRef.id, ...tenantPayload };

        await seedDefaultCategories(newTenant.id);
        await seedDefaultSettings(newTenant.id);

        setTenants(prev => [...prev, newTenant].sort((a,b) => a.name.localeCompare(b.name)));
        
        if (!selectedTenantId) {
            setSelectedTenantId(newTenant.id);
        }
    } catch(e) {
        console.error("Error adding tenant: ", e);
    }
  };

  const editTenant = async (tenantId: string, tenantData: Partial<Omit<Tenant, 'id'>>) => {
    try {
        const tenantRef = doc(db, 'tenants', tenantId);
        await updateDoc(tenantRef, tenantData);
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...tenantData } as Tenant : t).sort((a,b) => a.name.localeCompare(b.name)));
    } catch(e) {
        console.error("Error updating tenant: ", e);
    }
  };

  const deleteTenant = async (tenantId: string) => {
    try {
        await deleteDoc(doc(db, 'tenants', tenantId));
        const remainingTenants = tenants.filter(t => t.id !== tenantId);
        setTenants(remainingTenants);
        if (selectedTenantId === tenantId) {
            const newSelectedId = remainingTenants.length > 0 ? remainingTenants[0].id : null
            setSelectedTenantId(newSelectedId);
            if(newSelectedId) {
                localStorage.setItem('selectedTenantId', newSelectedId);
            } else {
                localStorage.removeItem('selectedTenantId');
            }
        }
    } catch(e) {
        console.error("Error deleting tenant: ", e);
    }
  };

  const login = async (token: string) => {
    const authCollection = collection(db, 'auth');
    const q = query(authCollection, where("email", "==", token));
    const querySnapshot = await getDocs(q);

    let authUser: User | null = null;
    
    if (querySnapshot.empty) {
        if (token === 'dhaneeshkmrt@gmail.com') {
            const newUser = { email: token };
            const docRef = await addDoc(authCollection, newUser);
            authUser = { id: docRef.id, email: token };
        } else {
            throw new Error("Invalid secret token.");
        }
    } else {
        const userDoc = querySnapshot.docs[0];
        authUser = { id: userDoc.id, ...userDoc.data() } as User;
    }

    if(authUser) {
      setUser(authUser);
      sessionStorage.setItem('user', JSON.stringify(authUser));
      await fetchTenants(authUser.id);
      router.push('/dashboard');
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    setTenants([]);
    setAllCategories([]);
    setAllTransactions([]);
    setSelectedTenantId(null);
    setSettings({ ...defaultSettings, tenantId: '' });
    router.push('/login');
  };

  const contextValue = useMemo(() => ({
    user,
    transactions: allTransactions,
    categories: allCategories,
    settings,
    tenants,
    selectedTenantId,
    setSelectedTenantId,
    addTransaction,
    addMultipleTransactions,
    editTransaction,
    deleteTransaction,
    addCategory,
    editCategory,
    deleteCategory,
    addSubcategory,
    editSubcategory,
    deleteSubcategory,
    addMicrocategory,
    editMicrocategory,
    deleteMicrocategory,
    updateSettings,
    addTenant,
    editTenant,
    deleteTenant,
    loading,
    loadingCategories,
    loadingSettings,
    loadingTenants,
    login,
    logout,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
      user, allTransactions, allCategories, settings, tenants, selectedTenantId, 
      loading, loadingCategories, loadingSettings, loadingTenants, authInitialized
    ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

    