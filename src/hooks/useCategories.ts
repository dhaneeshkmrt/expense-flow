
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Category, Subcategory, Microcategory } from '@/lib/types';
import { categories as defaultCategories } from '@/lib/data';
import {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User, Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, updateDoc, deleteDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase, Gift, HeartPulse, Home, Utensils, Car, Plane, ShieldAlert,
  GraduationCap, Sparkles, ShoppingBag, CircleDollarSign, Factory, HelpCircle,
  Apple, Building, User, Calendar,
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

export function useCategories(tenantId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const seedDefaultCategories = useCallback(async (tenantIdToSeed: string) => {
    const batch = writeBatch(db);
    defaultCategories.forEach((category) => {
        const categoryIdName = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const docRef = doc(db, 'categories', `${tenantIdToSeed}_${categoryIdName}`);
        const categoryForDb = {
            ...category,
            tenantId: tenantIdToSeed,
            icon: getIconName(category.icon),
            subcategories: category.subcategories.map(sub => ({...sub, microcategories: sub.microcategories || []})),
            budget: category.budget || 0,
        };
        batch.set(docRef, categoryForDb);
    });
    await batch.commit();
  }, []);

  const fetchCategories = useCallback(async (tenantIdToFetch: string) => {
    setLoadingCategories(true);
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
            budget: data.budget || 0,
          } as Category;
        });
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories: ", error);
    } finally {
      setLoadingCategories(false);
    }
  }, [seedDefaultCategories]);

  useEffect(() => {
    if (tenantId) {
      fetchCategories(tenantId);
    } else {
      setCategories([]);
      setLoadingCategories(false);
    }
  }, [tenantId, fetchCategories]);

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
    // @ts-ignore
    delete categoryForDb.id;
    await updateDoc(categoryRef, categoryForDb);
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'userId'> & { icon: string }) => {
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

    const docRef = doc(db, 'categories', id);
    await setDoc(docRef, {
      ...newCategory,
      icon: categoryData.icon
    });
    setCategories(prev => [...prev, newCategory]);
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
        dbUpdate.budget = categoryUpdate.budget;
    }
    
    if (Object.keys(dbUpdate).length > 0) {
        await updateDoc(categoryRef, dbUpdate);
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
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'>) => {
    const category = findCategory(categoryId);
    const id = `${categoryId}_${subcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [] };

    const updatedCategory = { ...category, subcategories: [...category.subcategories, newSubcategory] };
    await updateCategoryInDb(categoryId, updatedCategory);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const editSubcategory = async (categoryId: string, subcategoryId: string, subcategoryUpdate: Pick<Subcategory, 'name'>) => {
    const category = findCategory(categoryId);
    const updatedCategory = { ...category, subcategories: category.subcategories.map(sub => sub.id === subcategoryId ? { ...sub, ...subcategoryUpdate } : sub) };
    await updateCategoryInDb(categoryId, updatedCategory);
    setCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    const category = findCategory(categoryId);
    const updatedCategory = { ...category, subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId) };
    await updateCategoryInDb(categoryId, updatedCategory);
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
    await updateCategoryInDb(categoryId, updatedCategory);
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

  return {
    categories,
    loadingCategories,
    addCategory, editCategory, deleteCategory,
    addSubcategory, editSubcategory, deleteSubcategory,
    addMicrocategory, editMicrocategory, deleteMicrocategory,
    seedDefaultCategories,
  };
}
