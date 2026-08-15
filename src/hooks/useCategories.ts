
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Category, Subcategory, Microcategory, CategoryBudget, User } from '@/lib/types';
import {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User as UserIcon, Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, updateDoc, deleteDoc, setDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { logChange } from '@/lib/logger';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User: UserIcon, Calendar,
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

export function useCategories(tenantId: string | null, user: User | null, selectedYear: number, selectedMonth: number) {
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

      const fetchedCategories = querySnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            icon: getIconComponent(data.icon),
            subcategories: (data.subcategories || []).map((sub: any, sIdx: number) => {
              const subId = sub.id || `${doc.id}_sub_${sIdx}`;
              return {
                ...sub,
                id: subId,
                microcategories: (sub.microcategories || []).map((micro: any, mIdx: number) => ({
                  ...micro,
                  id: micro.id || `${subId}_micro_${mIdx}`
                }))
              };
            }),
            tenantId: data.tenantId,
            budget: 0, // Default budget, will be filled next
            order: data.order !== undefined ? data.order : index,
          } as Category;
        });

      fetchedCategories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
        subcategories: cat.subcategories.map(sub => ({
          ...sub,
          budget: allBudgets[currentMonthKey]?.[sub.id] || 0,
        })),
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
    await setDoc(categoryRef, categoryForDb, { merge: true });
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'budget'> & { icon: string; budget?: number; }) => {
    if (!tenantId || !user) return;
    const id = `cat_${crypto.randomUUID().replace(/-/g, '')}`;
    
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
    
    await logChange(tenantId, user.name, 'CREATE', 'categories', id, `Created category: ${categoryData.name}`, undefined, newCategory);
  };
  
  const editCategory = async (categoryId: string, categoryUpdate: EditCategoryData) => {
    if (!tenantId || !user) return;
    
    const oldCategory = categories.find(c => c.id === categoryId);
    const dbUpdate: { [key: string]: any } = {};

    if (categoryUpdate.name) dbUpdate.name = categoryUpdate.name;
    if (typeof categoryUpdate.icon === 'string') {
        dbUpdate.icon = categoryUpdate.icon;
    } else if (categoryUpdate.icon) {
        dbUpdate.icon = getIconName(categoryUpdate.icon);
    }
    
    if (Object.keys(dbUpdate).length > 0) {
        const categoryRef = doc(db, 'categories', categoryId);
        await setDoc(categoryRef, dbUpdate, { merge: true });
    }
    
    if (categoryUpdate.budget !== undefined) {
        const monthKey = getMonthKey(selectedYear, selectedMonth);
        const budgetDocRef = doc(db, 'budgets', tenantId);
        await setDoc(budgetDocRef, {
          budgets: { [monthKey]: { [categoryId]: categoryUpdate.budget } }
        }, { merge: true });
    }
    
    let updatedCat: Category | undefined;
    setCategories(prev => prev.map(c => {
        if (c.id === categoryId) {
            updatedCat = { ...c };
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
    
    if (categoryUpdate.name && oldCategory && categoryUpdate.name !== oldCategory.name) {
        try {
            const txQuery = query(collection(db, 'transactions'), where('tenantId', '==', tenantId));
            const txSnap = await getDocs(txQuery);
            const batch = writeBatch(db);
            let count = 0;
            txSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.categoryId === categoryId || data.category === oldCategory.name) {
                    batch.set(docSnap.ref, {
                        categoryId: categoryId,
                        category: categoryUpdate.name,
                    }, { merge: true });
                    count++;
                }
            });
            if (count > 0) await batch.commit();
        } catch (e) {
            console.error("Error updating transactions on category rename:", e);
        }
    }

    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Updated category: ${categoryUpdate.name || oldCategory?.name}`, oldCategory, updatedCat);
  };
  
  const deleteCategory = async (categoryId: string) => {
    if (!tenantId || !user) return;
    const categoryToDelete = categories.find(c => c.id === categoryId);
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    
    const budgetDocRef = doc(db, 'budgets', tenantId);
    const budgetDocSnap = await getDoc(budgetDocRef);
    if(budgetDocSnap.exists()) {
        const allBudgets = (budgetDocSnap.data() as CategoryBudget).budgets || {};
        for (const monthKey in allBudgets) {
            delete allBudgets[monthKey][categoryId];
            categoryToDelete?.subcategories.forEach(sub => {
              delete allBudgets[monthKey][sub.id];
            });
        }
        await setDoc(budgetDocRef, { budgets: allBudgets }, { merge: true });
    }

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    
    if (categoryToDelete) {
      await logChange(tenantId, user.name, 'DELETE', 'categories', categoryId, `Deleted category: ${categoryToDelete.name}`, categoryToDelete, undefined);
    }
  };

  const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'> & { budget?: number }) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const id = `sub_${crypto.randomUUID().replace(/-/g, '')}`;
    const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [], budget: subcategoryData.budget || 0 };

    const updatedCategory = { ...category, subcategories: [...category.subcategories, newSubcategory] };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);

    if (subcategoryData.budget && subcategoryData.budget > 0) {
      const monthKey = getMonthKey(selectedYear, selectedMonth);
      const budgetDocRef = doc(db, 'budgets', tenantId);
      await setDoc(budgetDocRef, {
        budgets: { [monthKey]: { [id]: subcategoryData.budget } }
      }, { merge: true });
    }

    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));

    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Added subcategory: ${newSubcategory.name} to ${category.name}`, category, updatedCategory);
  };

  const editSubcategory = async (categoryId: string, subcategoryId: string, subcategoryUpdate: { name?: string; budget?: number }) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const subcategoryToUpdate = category.subcategories.find(s => s.id === subcategoryId);
    const updatedCategory = { 
      ...category, 
      subcategories: category.subcategories.map(sub => {
        if (sub.id === subcategoryId) {
          const updatedSub = { ...sub };
          if (subcategoryUpdate.name) updatedSub.name = subcategoryUpdate.name;
          if (subcategoryUpdate.budget !== undefined) updatedSub.budget = subcategoryUpdate.budget;
          return updatedSub;
        }
        return sub;
      })
    };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);

    if (subcategoryUpdate.budget !== undefined) {
      const monthKey = getMonthKey(selectedYear, selectedMonth);
      const budgetDocRef = doc(db, 'budgets', tenantId);
      await setDoc(budgetDocRef, {
        budgets: { [monthKey]: { [subcategoryId]: subcategoryUpdate.budget } }
      }, { merge: true });
    }

    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    
    if (subcategoryUpdate.name && subcategoryToUpdate && subcategoryUpdate.name !== subcategoryToUpdate.name) {
      try {
        const txQuery = query(collection(db, 'transactions'), where('tenantId', '==', tenantId));
        const txSnap = await getDocs(txQuery);
        const batch = writeBatch(db);
        let count = 0;
        txSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (
            data.subcategoryId === subcategoryId ||
            data.subcategory === subcategoryToUpdate.name ||
            (data.subcategory && data.subcategory.trim().toLowerCase() === subcategoryToUpdate.name.trim().toLowerCase())
          ) {
            batch.set(docSnap.ref, {
              categoryId: categoryId,
              subcategoryId: subcategoryId,
              category: category.name,
              subcategory: subcategoryUpdate.name,
            }, { merge: true });
            count++;
          }
        });
        if (count > 0) await batch.commit();
      } catch (e) {
        console.error("Error updating transactions on subcategory rename:", e);
      }
    }

    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Edited subcategory: from "${subcategoryToUpdate?.name}" to "${subcategoryUpdate.name}" in ${category.name}`, category, updatedCategory);
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const subcategoryToDelete = category.subcategories.find(s => s.id === subcategoryId);
    const updatedCategory = { ...category, subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId) };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);

    const budgetDocRef = doc(db, 'budgets', tenantId);
    const budgetDocSnap = await getDoc(budgetDocRef);
    if(budgetDocSnap.exists()) {
        const allBudgets = (budgetDocSnap.data() as CategoryBudget).budgets || {};
        for (const monthKey in allBudgets) {
            delete allBudgets[monthKey][subcategoryId];
        }
        await setDoc(budgetDocRef, { budgets: allBudgets }, { merge: true });
    }

    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    
    if (subcategoryToDelete) {
      await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Deleted subcategory: ${subcategoryToDelete.name} from ${category.name}`, category, updatedCategory);
    }
  };

  const addMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryData: Omit<Microcategory, 'id'>) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const id = `micro_${crypto.randomUUID().replace(/-/g, '')}`;
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
    
    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Added micro-category: ${newMicrocategory.name} to ${category.name}/${updatedCategory.subcategories.find(s => s.id === subcategoryId)?.name}`, category, updatedCategory);
  };

  const editMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string, microcategoryUpdate: Pick<Microcategory, 'name'>) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    const microcategory = subcategory?.microcategories.find(m => m.id === microcategoryId);

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
    
    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Edited micro-category from "${microcategory?.name}" to "${microcategoryUpdate.name}"`, category, updatedCategory);
  };

  const deleteMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    const microcategory = subcategory?.microcategories.find(m => m.id === microcategoryId);
    
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
    
    if (microcategory) {
      await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Deleted micro category: ${microcategory.name}`, category, updatedCategory);
    }
  };

  const reorderCategories = async (orderedIds: string[]) => {
    if (!tenantId || !user) return;
    const newCategories: Category[] = [];
    const batch = writeBatch(db);
    
    orderedIds.forEach((id, index) => {
      const cat = categories.find(c => c.id === id);
      if (cat) {
        const updated = { ...cat, order: index };
        newCategories.push(updated);
        const docRef = doc(db, 'categories', id);
        batch.set(docRef, { order: index }, { merge: true });
      }
    });

    setCategories(newCategories);
    await batch.commit();
    await logChange(tenantId, user.name, 'UPDATE', 'categories', tenantId, `Reordered categories`, undefined, undefined);
  };

  const reorderSubcategories = async (categoryId: string, orderedSubcategoryIds: string[]) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    
    const reorderedSubs: Subcategory[] = [];
    orderedSubcategoryIds.forEach((id, index) => {
      const sub = category.subcategories.find(s => s.id === id);
      if (sub) {
        reorderedSubs.push({ ...sub, order: index });
      }
    });

    const updatedCategory = { ...category, subcategories: reorderedSubs };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Reordered subcategories in ${category.name}`, category, updatedCategory);
  };

  const reorderMicrocategories = async (categoryId: string, subcategoryId: string, orderedMicrocategoryIds: string[]) => {
    if (!tenantId || !user) return;
    const category = findCategory(categoryId);
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (!subcategory) return;

    const reorderedMicros: Microcategory[] = [];
    orderedMicrocategoryIds.forEach((id, index) => {
      const micro = (subcategory.microcategories || []).find(m => m.id === id);
      if (micro) {
        reorderedMicros.push({ ...micro, order: index });
      }
    });

    const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
                return { ...sub, microcategories: reorderedMicros };
            }
            return sub;
        })
    };
    const { budget, ...categoryToSave } = updatedCategory;
    await updateCategoryInDb(categoryId, categoryToSave);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    await logChange(tenantId, user.name, 'UPDATE', 'categories', categoryId, `Reordered micro categories in ${category.name}/${subcategory.name}`, category, updatedCategory);
  };

  return {
    categories,
    loadingCategories,
    addCategory, editCategory, deleteCategory,
    addSubcategory, editSubcategory, deleteSubcategory,
    addMicrocategory, editMicrocategory, deleteMicrocategory,
    reorderCategories, reorderSubcategories, reorderMicrocategories,
    seedDefaultCategories,
    isCopyingBudget,
  };
}
