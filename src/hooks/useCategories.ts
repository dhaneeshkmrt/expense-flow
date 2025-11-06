
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Category, Subcategory, Microcategory, CategoryBudget } from '@/lib/types';
import {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User, Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, updateDoc, deleteDoc, setDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User, Calendar,
};

export const getIconName = (iconComponent: React.ElementType) => {
  const iconEntry = Object.entries(iconMap).find(([, val]) => val === iconComponent);
  return iconEntry ? iconEntry[0] : 'HelpCircle';
}

export const getIconComponent = (iconName: string): React.ElementType => {
  return iconMap[iconName] || HelpCircle;
};

type EditCategoryData = {
    name?: string;
    icon?: string | React.ElementType;
    budget?: number;
};

export function useCategories(tenantId: string | null, selectedYear: number, selectedMonth: number) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isCopyingBudget, setIsCopyingBudget] = useState(false);

  const getMonthKey = useCallback((year: number, month: number) => {
    return format(new Date(year, month), 'yyyy-MM');
  }, []);

  const seedDefaultCategories = useCallback(async (tenantIdToSeed: string) => {
      const defaultCategoriesQuery = query(collection(db, 'defaultCategories'));
      const defaultCategoriesSnapshot = await getDocs(defaultCategoriesQuery);
      
      if (defaultCategoriesSnapshot.empty) {
          console.warn("`defaultCategories` collection is empty. Cannot seed tenant categories.");
          return;
      }

      const batch = writeBatch(db);
      const monthKey = getMonthKey(new Date().getFullYear(), new Date().getMonth());
      const budgetDocRef = doc(db, 'budgets', tenantIdToSeed);
      const initialBudgets: CategoryBudget['budgets'] = { [monthKey]: {} };
      
      defaultCategoriesSnapshot.forEach((docSnap) => {
          const category = docSnap.data();
          const categoryIdName = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          const docId = `${tenantIdToSeed}_${categoryIdName}`;
          const docRef = doc(db, 'categories', docId);

          const categoryForDb = {
              name: category.name,
              icon: category.icon,
              subcategories: category.subcategories.map((sub: any) => ({
                  ...sub, 
                  microcategories: sub.microcategories || []
              })),
              tenantId: tenantIdToSeed,
          };
          batch.set(docRef, categoryForDb);

          if (category.budget) {
              initialBudgets[monthKey][docId] = category.budget;
          }
      });
      
      batch.set(budgetDocRef, { budgets: initialBudgets }, { merge: true });
      await batch.commit();

  }, [getMonthKey]);
  
  const fetchCategories = useCallback(async (tenantIdToFetch: string, year: number, month: number) => {
    setLoadingCategories(true);
    setIsCopyingBudget(false);
    try {
      const q = query(collection(db, 'categories'), where("tenantId", "==", tenantIdToFetch));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          await seedDefaultCategories(tenantIdToFetch);
          querySnapshot = await getDocs(q);
      }

      const fetchedCategories = querySnapshot.docs.map(doc => {
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
            budget: 0, // Default budget, will be filled next
          } as Category;
        });

      // Fetch budget data
      const budgetDocRef = doc(db, 'budgets', tenantIdToFetch);
      const budgetDocSnap = await getDoc(budgetDocRef);
      let allBudgets: CategoryBudget['budgets'] = {};

      if (budgetDocSnap.exists()) {
        allBudgets = (budgetDocSnap.data() as CategoryBudget).budgets || {};
      }

      const currentMonthKey = getMonthKey(year, month);
      
      if (!allBudgets[currentMonthKey]) {
        setIsCopyingBudget(true);
        // Find the most recent previous month with budgets
        const previousMonthKeys = Object.keys(allBudgets).sort().reverse();
        const mostRecentMonthKey = previousMonthKeys.find(key => key < currentMonthKey);
        
        if (mostRecentMonthKey) {
            allBudgets[currentMonthKey] = allBudgets[mostRecentMonthKey];
            await setDoc(budgetDocRef, { budgets: allBudgets }, { merge: true });
        } else {
            allBudgets[currentMonthKey] = {}; // No previous budget, start fresh
        }
      }

      const finalCategories = fetchedCategories.map(cat => ({
        ...cat,
        budget: allBudgets[currentMonthKey]?.[cat.id] || 0,
      }));
      
      setCategories(finalCategories);

    } catch (error) {
      console.error("Error fetching categories: ", error);
    } finally {
      setLoadingCategories(false);
      setIsCopyingBudget(false);
    }
  }, [seedDefaultCategories, getMonthKey]);

  useEffect(() => {
    if (tenantId) {
      fetchCategories(tenantId, selectedYear, selectedMonth);
    } else {
      setCategories([]);
      setLoadingCategories(false);
    }
  }, [tenantId, selectedYear, selectedMonth, fetchCategories]);

  const findCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) throw new Error(`Category with id ${categoryId} not found`);
    return category;
  }

  const updateCategoryInDb = async (categoryId: string, updatedCategory: Omit<Category, 'budget'>) => {
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryForDb = {
        ...updatedCategory,
        icon: typeof updatedCategory.icon === 'string' ? updatedCategory.icon : getIconName(updatedCategory.icon),
    };
    // @ts-ignore
    delete categoryForDb.id;
    await updateDoc(categoryRef, categoryForDb);
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'budget'> & { icon: string; budget?: number; }) => {
    if (!tenantId) return;
    const id = `${tenantId}_${categoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    const newCategory: Category = {
      id,
      name: categoryData.name,
      icon: getIconComponent(categoryData.icon),
      subcategories: [],
      tenantId: tenantId,
      budget: categoryData.budget || 0,
    };
    
    const { budget, ...categoryToSave } = newCategory;

    const docRef = doc(db, 'categories', id);
    await setDoc(docRef, {
      ...categoryToSave,
      icon: categoryData.icon
    });
    
    if (categoryData.budget && categoryData.budget > 0) {
      const monthKey = getMonthKey(selectedYear, selectedMonth);
      const budgetDocRef = doc(db, 'budgets', tenantId);
      await setDoc(budgetDocRef, {
        budgets: { [monthKey]: { [id]: categoryData.budget } }
      }, { merge: true });
    }

    setCategories(prev => [...prev, newCategory]);
  };
  
  const editCategory = async (categoryId: string, categoryUpdate: EditCategoryData) => {
    if (!tenantId) return;
    
    const dbUpdate: { [key: string]: any } = {};

    if (categoryUpdate.name) dbUpdate.name = categoryUpdate.name;
    if (typeof categoryUpdate.icon === 'string') {
        dbUpdate.icon = categoryUpdate.icon;
    } else if (categoryUpdate.icon) {
        dbUpdate.icon = getIconName(categoryUpdate.icon);
    }
    
    if (Object.keys(dbUpdate).length > 0) {
        const categoryRef = doc(db, 'categories', categoryId);
        await updateDoc(categoryRef, dbUpdate);
    }
    
    if (categoryUpdate.budget !== undefined) {
        const monthKey = getMonthKey(selectedYear, selectedMonth);
        const budgetDocRef = doc(db, 'budgets', tenantId);
        await setDoc(budgetDocRef, {
          budgets: { [monthKey]: { [categoryId]: categoryUpdate.budget } }
        }, { merge: true });
    }
    
    setCategories(prev => prev.map(c => {
        if (c.id === categoryId) {
            const updatedCat = { ...c };
            if (categoryUpdate.name) updatedCat.name = categoryUpdate.name;
            if (categoryUpdate.icon && typeof categoryUpdate.icon === 'string') {
                updatedCat.icon = getIconComponent(categoryUpdate.icon);
            } else if (categoryUpdate.icon) {
                updatedCat.icon = categoryUpdate.icon;
            }
            if (categoryUpdate.budget !== undefined) {
                updatedCat.budget = categoryUpdate.budget;
            }
            return updatedCat;
        }
        return c;
    }));
  };
  
  const deleteCategory = async (categoryId: string) => {
    if (!tenantId) return;
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    
    const budgetDocRef = doc(db, 'budgets', tenantId);
    const budgetDocSnap = await getDoc(budgetDocRef);
    if(budgetDocSnap.exists()) {
        const allBudgets = (budgetDocSnap.data() as CategoryBudget).budgets || {};
        for (const monthKey in allBudgets) {
            delete allBudgets[monthKey][categoryId];
        }
        await setDoc(budgetDocRef, { budgets: allBudgets }, { merge: true });
    }

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'>) => {
    const category = findCategory(categoryId);
    const id = `${categoryId}_${subcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [] };

    const updatedCategory = { ...category, subcategories: [...category.subcategories, newSubcategory] };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const editSubcategory = async (categoryId: string, subcategoryId: string, subcategoryUpdate: Pick<Subcategory, 'name'>) => {
    const category = findCategory(categoryId);
    const updatedCategory = { ...category, subcategories: category.subcategories.map(sub => sub.id === subcategoryId ? { ...sub, ...subcategoryUpdate } : sub) };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    const category = findCategory(categoryId);
    const updatedCategory = { ...category, subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId) };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
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
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const editMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string, microcategoryUpdate: Pick<Microcategory, 'name'>) => {
    const category = findCategory(categoryId);
    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
                return { ...sub, microcategories: (sub.microcategories || []).map(micro => micro.id === microcategoryId ? { ...micro, ...microcategoryUpdate } : micro) };
            }
            return sub;
        })
    };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
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
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  return {
    categories,
    loadingCategories,
    addCategory, editCategory, deleteCategory,
    addSubcategory, editSubcategory, deleteSubcategory,
    addMicrocategory, editMicrocategory, deleteMicrocategory,
    seedDefaultCategories,
    isCopyingBudget,
  };
}
