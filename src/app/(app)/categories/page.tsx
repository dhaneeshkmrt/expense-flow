
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { SubcategoryDialog } from '@/components/categories/subcategory-dialog';
import type { Category, Subcategory, Microcategory } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MicrocategoryDialog } from '@/components/categories/microcategory-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
  const { categories, deleteCategory, deleteSubcategory, deleteMicrocategory, loadingCategories, selectedTenantId, selectedMonthName } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [microcategoryDialogOpen, setMicrocategoryDialogOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedMicrocategory, setSelectedMicrocategory] = useState<Microcategory | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleAddSubcategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSubcategoryDialogOpen(true);
  };

  const handleEditSubcategory = (category: Category, subcategory: Subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSubcategoryDialogOpen(true);
  };
  
  const handleAddMicrocategory = (category: Category, subcategory: Subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSelectedMicrocategory(null);
    setMicrocategoryDialogOpen(true);
  };
  
  const handleEditMicrocategory = (category: Category, subcategory: Subcategory, microcategory: Microcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSelectedMicrocategory(microcategory);
    setMicrocategoryDialogOpen(true);
  };

  if (loadingCategories) {
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
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your expense categories and subcategories.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleAddCategory} disabled={!selectedTenantId}>
                <PlusCircle className="mr-2" />
                Add Category
            </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const Icon = typeof category.icon === 'string' ? () => null : category.icon;
          const monthlyBudget = category.budget;
          return (
            <Card key={category.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-3">
                        {Icon && <Icon className="w-6 h-6 text-primary" />}
                        <span>{category.name}</span>
                    </CardTitle>
                    {monthlyBudget !== undefined && monthlyBudget > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Budget for {selectedMonthName}: <span className="font-semibold">{formatCurrency(monthlyBudget)}</span>
                        </p>
                    )}
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
                            This action cannot be undone. This will permanently delete the <strong>{category.name}</strong> category and all its subcategories.
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
                  <Collapsible key={sub.id} open={openCollapsibles[sub.id]} onOpenChange={() => toggleCollapsible(sub.id)} className="group/sub">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
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
                                    <AlertDialogDescription>
                                        This will permanently delete the <strong>{sub.name}</strong> subcategory and all its micro-subcategories.
                                    </AlertDialogDescription>
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
                                    <Badge variant="secondary" className="pr-7">
                                        {micro.name}
                                    </Badge>
                                    <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover/micro:opacity-100 bg-secondary/50 rounded-full">
                                        <button onClick={() => handleEditMicrocategory(category, sub, micro)} className="mr-3 text-xs">
                                            <Edit className="h-3 w-3" />
                                        </button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="mr-1 text-destructive">
                                                <Trash2 className="h-3 w-3" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the <strong>{micro.name}</strong> micro-subcategory.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteMicrocategory(category.id, sub.id, micro.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
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
                {category.subcategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No subcategories yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => handleAddSubcategory(category)}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Subcategory
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      <CategoryDialog open={categoryDialogOpen} setOpen={setCategoryDialogOpen} category={selectedCategory} />
      <SubcategoryDialog open={subcategoryDialogOpen} setOpen={setSubcategoryDialogOpen} category={selectedCategory} subcategory={selectedSubcategory} />
      <MicrocategoryDialog open={microcategoryDialogOpen} setOpen={setMicrocategoryDialogOpen} category={selectedCategory} subcategory={selectedSubcategory} microcategory={selectedMicrocategory} />
    </div>
  );
}
