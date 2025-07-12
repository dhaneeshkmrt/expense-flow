'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Transaction, Category, Subcategory, Microcategory } from './types';
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
import { collection, addDoc, getDocs, doc, writeBatch, deleteDoc, updateDoc, query, orderBy, where, getDoc } from 'firebase/firestore';

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

const getIconName = (iconComponent: React.ElementType) => {
    const iconEntry = Object.entries(iconMap).find(([, val]) => val === iconComponent);
    return iconEntry ? iconEntry[0] : 'HelpCircle';
}

const getIconComponent = (iconName: string): React.ElementType => {
    return iconMap[iconName] || HelpCircle;
};


interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  editTransaction: (transactionId: string, transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'subcategories' | 'icon' | 'userId'> & { icon: string }) => Promise<void>;
  editCategory: (categoryId: string, category: Partial<Pick<Category, 'name' | 'icon'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id' | 'microcategories'>) => Promise<void>;
  editSubcategory: (categoryId: string, subcategoryId: string, subcategory: Pick<Subcategory, 'name'>) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  addMicrocategory: (categoryId: string, subcategoryId: string, microcategory: Omit<Microcategory, 'id'>) => Promise<void>;
  editMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string, microcategory: Pick<Microcategory, 'name'>) => Promise<void>;
  deleteMicrocategory: (categoryId: string, subcategoryId: string, microcategoryId: string) => Promise<void>;
  loading: boolean;
  loadingCategories: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// A mock user ID to use since we've removed authentication
const MOCK_USER_ID = 'local_user';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const fetchedTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        
        // Sort transactions by date client-side
        fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Error fetching transactions: ", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const categoriesCollection = collection(db, 'categories');
        let querySnapshot = await getDocs(categoriesCollection);

        if (querySnapshot.empty) {
            const batch = writeBatch(db);
            initialCategories.forEach((category) => {
                const docRef = doc(db, 'categories', category.id);
                const categoryForDb = {
                    ...category,
                    icon: getIconName(category.icon),
                    subcategories: category.subcategories.map(sub => ({...sub, microcategories: sub.microcategories || []})),
                    userId: MOCK_USER_ID
                };
                batch.set(docRef, categoryForDb);
            });
            await batch.commit();
            querySnapshot = await getDocs(categoriesCollection);
        }

        const fetchedCategories = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              icon: getIconComponent(data.icon),
              subcategories: data.subcategories.map((sub: any) => ({
                ...sub,
                microcategories: sub.microcategories || []
              })),
            } as Category;
          });
        setCategories(fetchedCategories);

      } catch (error) {
        console.error("Error fetching categories: ", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchTransactions();
    fetchCategories();
  }, []);


  const findCategory = (categoryId: string) => {
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error(`Category with id ${categoryId} not found`);
      return category;
  }

  const updateCategoryInDb = async (categoryId: string, updatedCategory: Category) => {
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryForDb = {
        ...updatedCategory,
        icon: typeof updatedCategory.icon === 'string' ? updatedCategory.icon : getIconName(updatedCategory.icon),
    };
    await updateDoc(categoryRef, categoryForDb);
  }

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    const transactionWithUser = {...transaction, userId: MOCK_USER_ID};
    try {
      const docRef = await addDoc(collection(db, "transactions"), transactionWithUser);
      setTransactions(prev => [{ ...transactionWithUser, id: docRef.id }, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const editTransaction = async (transactionId: string, transactionUpdate: Omit<Transaction, 'id' | 'userId'>) => {
    const transactionWithUser = {...transactionUpdate, userId: MOCK_USER_ID};
    try {
        const transactionRef = doc(db, "transactions", transactionId);
        await updateDoc(transactionRef, transactionWithUser);
        setTransactions(prev => 
            prev.map(t => t.id === transactionId ? { id: transactionId, ...transactionWithUser } : t)
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


  const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'userId'> & { icon: string }) => {
    const id = categoryData.name.toLowerCase().replace(/\s+/g, '_');
    const newCategoryForState: Category = {
      ...categoryData,
      id,
      subcategories: [],
      icon: getIconComponent(categoryData.icon),
    };
    const categoryForDb = {
        name: categoryData.name,
        icon: categoryData.icon,
        subcategories: [],
        userId: MOCK_USER_ID
    }

    const docRef = doc(db, 'categories', id);
    await writeBatch(db).set(docRef, categoryForDb).commit();
    setCategories(prev => [...prev, newCategoryForState]);
  };

  const editCategory = async (categoryId: string, categoryUpdate: Partial<Pick<Category, 'name' | 'icon'>>) => {
    const dbUpdate: any = {};
    if(categoryUpdate.name) dbUpdate.name = categoryUpdate.name;
    if(typeof categoryUpdate.icon === 'string') dbUpdate.icon = categoryUpdate.icon;
    else if (categoryUpdate.icon) dbUpdate.icon = getIconName(categoryUpdate.icon);

    if(Object.keys(dbUpdate).length > 0) {
        const categoryRef = doc(db, 'categories', categoryId);
        await updateDoc(categoryRef, dbUpdate);
    }
    
    setCategories(prev => prev.map(c => {
        if (c.id === categoryId) {
            const updatedCat = {...c};
            if(categoryUpdate.name) updatedCat.name = categoryUpdate.name;
            if(categoryUpdate.icon) updatedCat.icon = typeof categoryUpdate.icon === 'string' ? getIconComponent(categoryUpdate.icon) : categoryUpdate.icon;
            return updatedCat;
        }
        return c;
    }));
  };
  
  const deleteCategory = async (categoryId: string) => {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };
  
  const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'>) => {
    const category = findCategory(categoryId);
    const id = subcategoryData.name.toLowerCase().replace(/\s+/g, '_');
    const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [] };

    const updatedCategory = {
        ...category,
        subcategories: [...category.subcategories, newSubcategory]
    };

    await updateCategoryInDb(categoryId, updatedCategory);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
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
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId)
    };
    await updateCategoryInDb(categoryId, updatedCategory);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };
  
  const addMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryData: Omit<Microcategory, 'id'>) => {
    const category = findCategory(categoryId);
    const id = microcategoryData.name.toLowerCase().replace(/\s+/g, '_');
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
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
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
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
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
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };


  const contextValue = useMemo(() => ({
    transactions,
    categories,
    addTransaction,
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
    loading: loading,
    loadingCategories: loadingCategories,
  }), [transactions, categories, loading, loadingCategories]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
