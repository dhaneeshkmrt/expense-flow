'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useApp } from '@/lib/provider';
import type { Category, Subcategory, Microcategory } from '@/lib/types';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { SubcategoryDialog } from '@/components/categories/subcategory-dialog';
import { MicrocategoryDialog } from '@/components/categories/microcategory-dialog';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, updateDoc, deleteDoc, setDoc, getDocs, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { categories as staticCategories } from '@/lib/data';
import { getIconComponent, getIconName } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

type CategoryWithOptionalBudget = Omit<Category, 'budget'> & { budget?: number };

const AccessDenied = () => (
    <div className="flex flex-col gap-6 items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-destructive"/>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page. Please contact your administrator.</p>
    </div>
);

export default function DefaultCategoriesPage() {
    const { isAdminUser } = useApp();
    const { toast } = useToast();
    const [categories, setCategories] = useState<CategoryWithOptionalBudget[]>([]);
    const [loading, setLoading] = useState(true);

    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
    const [microcategoryDialogOpen, setMicrocategoryDialogOpen] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptionalBudget | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
    const [selectedMicrocategory, setSelectedMicrocategory] = useState<Microcategory | null>(null);
    const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isAdminUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(db, 'defaultCategories'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedCategories: CategoryWithOptionalBudget[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                fetchedCategories.push({
                    id: doc.id,
                    name: data.name,
                    icon: getIconComponent(data.icon),
                    subcategories: (data.subcategories || []).map((sub: any) => ({
                        ...sub,
                        microcategories: sub.microcategories || []
                    })),
                    budget: data.budget,
                } as CategoryWithOptionalBudget);
            });
            setCategories(fetchedCategories.sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching default categories:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAdminUser]);

    const seedStaticCategories = async () => {
        try {
            const batch = writeBatch(db);
            staticCategories.forEach(cat => {
                const docId = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                const docRef = doc(db, 'defaultCategories', docId);
                const { icon, ...rest } = cat;
                batch.set(docRef, { ...rest, icon: getIconName(icon) });
            });
            await batch.commit();
            toast({
                title: 'Seeding successful',
                description: 'Default categories have been seeded to the database.',
            });
        } catch (error: any) {
            toast({
                title: 'Seeding failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };
    
    const updateCategoryInDb = async (categoryId: string, categoryData: any) => {
        const categoryRef = doc(db, 'defaultCategories', categoryId);
        await updateDoc(categoryRef, categoryData);
    };

    const handleAddCategory = () => {
        setSelectedCategory(null);
        setCategoryDialogOpen(true);
    };

    const handleEditCategory = (category: CategoryWithOptionalBudget) => {
        setSelectedCategory(category);
        setCategoryDialogOpen(true);
    };

    const handleAddSubcategory = (category: CategoryWithOptionalBudget) => {
        setSelectedCategory(category);
        setSelectedSubcategory(null);
        setSubcategoryDialogOpen(true);
    };
    
    const handleEditSubcategory = (category: CategoryWithOptionalBudget, subcategory: Subcategory) => {
        setSelectedCategory(category);
        setSelectedSubcategory(subcategory);
        setSubcategoryDialogOpen(true);
    };
      
    const handleAddMicrocategory = (category: CategoryWithOptionalBudget, subcategory: Subcategory) => {
        setSelectedCategory(category);
        setSelectedSubcategory(subcategory);
        setSelectedMicrocategory(null);
        setMicrocategoryDialogOpen(true);
    };
      
    const handleEditMicrocategory = (category: CategoryWithOptionalBudget, subcategory: Subcategory, microcategory: Microcategory) => {
        setSelectedCategory(category);
        setSelectedSubcategory(subcategory);
        setSelectedMicrocategory(microcategory);
        setMicrocategoryDialogOpen(true);
    };

    const findCategory = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) throw new Error(`Category with id ${categoryId} not found`);
        return category;
    }

    const addCategory = async (categoryData: Omit<Category, 'id' | 'subcategories' | 'icon' | 'tenantId' | 'budget'> & { icon: string; budget?: number; }) => {
        const docId = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const docRef = doc(db, 'defaultCategories', docId);
        await setDoc(docRef, categoryData);
    };

    const editCategory = async (categoryId: string, categoryUpdate: { name?: string; icon?: string | React.ElementType; budget?: number; }) => {
        const dbUpdate: { [key: string]: any } = { ...categoryUpdate };
        if (typeof categoryUpdate.icon !== 'string') {
            dbUpdate.icon = getIconName(categoryUpdate.icon as React.ElementType);
        }
        const categoryRef = doc(db, 'defaultCategories', categoryId);
        await updateDoc(categoryRef, dbUpdate);
    };

    const deleteCategory = async (categoryId: string) => {
        const categoryRef = doc(db, 'defaultCategories', categoryId);
        await deleteDoc(categoryRef);
    };

    const addSubcategory = async (categoryId: string, subcategoryData: Omit<Subcategory, 'id' | 'microcategories'>) => {
        const category = findCategory(categoryId);
        const id = `${category.name.toLowerCase()}_${subcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
        const newSubcategory: Subcategory = { ...subcategoryData, id, microcategories: [] };
        const updatedSubcategories = [...category.subcategories, newSubcategory];
        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };

    const editSubcategory = async (categoryId: string, subcategoryId: string, subcategoryUpdate: Pick<Subcategory, 'name'>) => {
        const category = findCategory(categoryId);
        const updatedSubcategories = category.subcategories.map(sub => sub.id === subcategoryId ? { ...sub, ...subcategoryUpdate } : sub);
        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };

    const deleteSubcategory = async (categoryId: string, subcategoryId: string) => {
        const category = findCategory(categoryId);
        const updatedSubcategories = category.subcategories.filter(sub => sub.id !== subcategoryId);
        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };
    
    const addMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryData: Omit<Microcategory, 'id'>) => {
        const category = findCategory(categoryId);
        const subcategory = category.subcategories.find(s => s.id === subcategoryId);
        if (!subcategory) return;
        
        const id = `${subcategory.name.toLowerCase()}_${microcategoryData.name.toLowerCase().replace(/\s+/g, '_')}`;
        const newMicrocategory: Microcategory = { ...microcategoryData, id };
        
        const updatedMicrocategories = [...(subcategory.microcategories || []), newMicrocategory];
        const updatedSubcategories = category.subcategories.map(s => s.id === subcategoryId ? { ...s, microcategories: updatedMicrocategories } : s);
        
        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };
    
    const editMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string, microcategoryUpdate: Pick<Microcategory, 'name'>) => {
        const category = findCategory(categoryId);
        const subcategory = category.subcategories.find(s => s.id === subcategoryId);
        if (!subcategory) return;

        const updatedMicrocategories = (subcategory.microcategories || []).map(micro => micro.id === microcategoryId ? { ...micro, ...microcategoryUpdate } : micro);
        const updatedSubcategories = category.subcategories.map(s => s.id === subcategoryId ? { ...s, microcategories: updatedMicrocategories } : s);

        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };

    const deleteMicrocategory = async (categoryId: string, subcategoryId: string, microcategoryId: string) => {
        const category = findCategory(categoryId);
        const subcategory = category.subcategories.find(s => s.id === subcategoryId);
        if (!subcategory) return;
        
        const updatedMicrocategories = (subcategory.microcategories || []).filter(micro => micro.id !== microcategoryId);
        const updatedSubcategories = category.subcategories.map(s => s.id === subcategoryId ? { ...s, microcategories: updatedMicrocategories } : s);
        
        await updateCategoryInDb(categoryId, { subcategories: updatedSubcategories });
    };

    if (!isAdminUser && !loading) {
        return <AccessDenied />;
    }
    
    if (loading) {
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-2 h-5 w-72" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                  <Card key={i}>
                      <CardHeader>
                          <Skeleton className="h-6 w-1/2" />
                      </CardHeader>
                      <CardContent>
                          <Skeleton className="h-16 w-full" />
                      </CardContent>
                      <CardFooter>
                          <Skeleton className="h-8 w-1/3" />
                      </CardFooter>
                  </Card>
              ))}
            </div>
          </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Default Categories</h1>
            <p className="text-muted-foreground">Manage the master list of categories for all new tenants.</p>
            </div>
            <div className="flex items-center gap-2">
                {categories.length === 0 && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="mr-2" />
                                Seed Static Categories
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Seed Default Categories?</AlertDialogTitle>
                            <AlertDialogDescription>
                                The `defaultCategories` collection is empty. This will seed it with the static categories from `src/lib/data.ts`. This is a one-time operation.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={seedStaticCategories} className="bg-destructive hover:bg-destructive/90">Seed</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button onClick={handleAddCategory}>
                    <PlusCircle className="mr-2" />
                    Add Category
                </Button>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
            const Icon = category.icon as React.ElementType;
            return (
                <Card key={category.id}>
                <CardHeader className="flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-3">
                            {Icon && <Icon className="w-6 h-6 text-primary" />}
                            <span>{category.name}</span>
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the <strong>{category.name}</strong> default category.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategory(category.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {category.subcategories.map((sub) => (
                    <Collapsible key={sub.id} open={openCollapsibles[sub.id]} onOpenChange={() => setOpenCollapsibles(prev => ({...prev, [sub.id]: !prev[sub.id]}))}>
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted group/sub">
                            <CollapsibleTrigger asChild>
                                <button className="flex items-center gap-2">
                                    <span className="font-semibold">{sub.name}</span>
                                    {sub.microcategories && sub.microcategories.length > 0 && (
                                        openCollapsibles[sub.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                                    )}
                                </button>
                            </CollapsibleTrigger>
                            <div className="flex items-center opacity-0 group-hover/sub:opacity-100">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddMicrocategory(category, sub)}>
                                    <PlusCircle className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditSubcategory(category, sub)}>
                                    <Edit className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the <strong>{sub.name}</strong> subcategory.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteSubcategory(category.id, sub.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <CollapsibleContent>
                            <div className="flex flex-wrap gap-1 pl-6 pr-2 py-2">
                                {(sub.microcategories || []).map((micro) => (
                                    <div key={micro.id} className="group/micro relative">
                                        <Badge variant="secondary" className="pr-7">{micro.name}</Badge>
                                        <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover/micro:opacity-100 bg-secondary/50 rounded-full">
                                            <button onClick={() => handleEditMicrocategory(category, sub, micro)} className="mr-3 text-xs"><Edit className="h-3 w-3" /></button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><button className="mr-1 text-destructive"><Trash2 className="h-3 w-3" /></button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the <strong>{micro.name}</strong> micro-subcategory.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMicrocategory(category.id, sub.id, micro.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                                {(sub.microcategories || []).length === 0 && <p className="text-xs text-muted-foreground">No micro-subcategories.</p>}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    ))}
                    {category.subcategories.length === 0 && <p className="text-sm text-muted-foreground">No subcategories yet.</p>}
                </CardContent>
                <CardFooter>
                    <Button variant="ghost" size="sm" onClick={() => handleAddSubcategory(category)}>
                    <PlusCircle className="w-4 h-4 mr-2" />Add Subcategory
                    </Button>
                </CardFooter>
                </Card>
            );
            })}
        </div>
        
        <CategoryDialog 
            open={categoryDialogOpen} 
            setOpen={setCategoryDialogOpen} 
            category={selectedCategory} 
            onAdd={addCategory} 
            onEdit={editCategory}
            isDefaultCategory={true}
        />
        <SubcategoryDialog 
            open={subcategoryDialogOpen} 
            setOpen={setSubcategoryDialogOpen} 
            category={selectedCategory} 
            subcategory={selectedSubcategory}
            onAdd={addSubcategory}
            onEdit={editSubcategory}
            isDefaultCategory={true}
        />
        <MicrocategoryDialog 
            open={microcategoryDialogOpen} 
            setOpen={setMicrocategoryDialogOpen} 
            category={selectedCategory} 
            subcategory={selectedSubcategory} 
            microcategory={selectedMicrocategory}
            onAdd={addMicrocategory}
            onEdit={editMicrocategory}
            isDefaultCategory={true}
        />
        </div>
    );
}
