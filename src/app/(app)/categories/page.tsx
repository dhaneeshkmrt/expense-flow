'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Loader2, PiggyBank, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { SubcategoryDialog } from '@/components/categories/subcategory-dialog';
import type { Category, Subcategory, Microcategory } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MicrocategoryDialog } from '@/components/categories/microcategory-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
  const { 
    categories, 
    deleteCategory, 
    deleteSubcategory, 
    deleteMicrocategory, 
    reorderCategories, 
    reorderSubcategories, 
    reorderMicrocategories, 
    loadingCategories, 
    selectedTenantId, 
    selectedMonthName, 
    isCopyingBudget 
  } = useApp();
  const formatCurrency = useCurrencyFormatter();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [microcategoryDialogOpen, setMicrocategoryDialogOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedMicrocategory, setSelectedMicrocategory] = useState<Microcategory | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  const totalBudget = useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
  }, [categories]);

  const totalSubcategoryBudget = useMemo(() => {
    return categories.reduce((totalSum, cat) => {
      return totalSum + (cat.subcategories || []).reduce((subSum, sub) => subSum + (sub.budget || 0), 0);
    }, 0);
  }, [categories]);

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

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const newOrderedIds = categories.map(c => c.id);
    const temp = newOrderedIds[index];
    newOrderedIds[index] = newOrderedIds[targetIndex];
    newOrderedIds[targetIndex] = temp;
    await reorderCategories(newOrderedIds);
  };

  const handleMoveSubcategory = async (category: Category, index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= category.subcategories.length) return;
    const newOrderedIds = category.subcategories.map(s => s.id);
    const temp = newOrderedIds[index];
    newOrderedIds[index] = newOrderedIds[targetIndex];
    newOrderedIds[targetIndex] = temp;
    await reorderSubcategories(category.id, newOrderedIds);
  };

  const handleMoveMicrocategory = async (category: Category, subcategory: Subcategory, index: number, direction: 'left' | 'right') => {
    const micros = subcategory.microcategories || [];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= micros.length) return;
    const newOrderedIds = micros.map(m => m.id);
    const temp = newOrderedIds[index];
    newOrderedIds[index] = newOrderedIds[targetIndex];
    newOrderedIds[targetIndex] = temp;
    await reorderMicrocategories(category.id, subcategory.id, newOrderedIds);
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
          {isCopyingBudget && (
            <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Setting up new month...</AlertTitle>
                <AlertDescription>
                    Copying budgets from the previous month. Please wait.
                </AlertDescription>
            </Alert>
          )}
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
          <h1 className="text-3xl font-bold tracking-tight text-primary">Categories</h1>
          <p className="text-muted-foreground">Manage your expense categories and their budgets for {selectedMonthName}.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md border p-2">
                <PiggyBank className="h-6 w-6 text-muted-foreground" />
                <div>
                    <div className="text-xs text-muted-foreground">Category Budget</div>
                    <div className="text-base font-bold text-primary">{formatCurrency(totalBudget)}</div>
                </div>
            </div>
            {totalSubcategoryBudget > 0 && (
                <div className="flex items-center gap-2 rounded-md border p-2">
                    <PiggyBank className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <div className="text-xs text-muted-foreground">Subcategory Budget Total</div>
                        <div className="text-base font-bold text-primary">{formatCurrency(totalSubcategoryBudget)}</div>
                    </div>
                </div>
            )}
            <Button onClick={handleAddCategory} disabled={!selectedTenantId}>
                <PlusCircle className="mr-2" />
                Add Category
            </Button>
        </div>
      </div>
      {isCopyingBudget && (
        <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Setting up new month...</AlertTitle>
            <AlertDescription>
                Copying budgets from the previous month. Please wait.
            </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category, catIdx) => {
          const Icon = typeof category.icon === 'string' ? () => null : category.icon;
          const monthlyBudget = category.budget;
          const subcategoryBudgetTotal = (category.subcategories || []).reduce((sum, sub) => sum + (sub.budget || 0), 0);
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
                            Budget for {selectedMonthName}: <span className="font-semibold text-primary">{formatCurrency(monthlyBudget)}</span>
                        </p>
                    )}
                    {subcategoryBudgetTotal > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Subcategories Budget Total: <span className="font-semibold text-primary">{formatCurrency(subcategoryBudgetTotal)}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => handleMoveCategory(catIdx, 'up')}
                    disabled={catIdx === 0}
                    title="Move category up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => handleMoveCategory(catIdx, 'down')}
                    disabled={catIdx === categories.length - 1}
                    title="Move category down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
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
                            This action cannot be undone. This will permanently delete the <strong>{category.name}</strong> category and all its subcategories and budget history.
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
                {category.subcategories.map((sub, subIdx) => (
                  <Collapsible key={sub.id} open={openCollapsibles[sub.id]} onOpenChange={() => toggleCollapsible(sub.id)} className="group/sub">
                    <div className="relative flex items-center justify-between p-2 rounded-md hover:bg-muted group/sub">
                        <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 flex-1 min-w-0 text-left pr-2">
                                <span className="font-semibold text-sm leading-snug break-words">{sub.name}</span>
                                {sub.budget !== undefined && sub.budget > 0 && (
                                    <Badge variant="outline" className="text-[10px] font-normal text-primary border-primary/30 py-0 px-1.5 shrink-0">
                                        {formatCurrency(sub.budget)}
                                    </Badge>
                                )}
                                {sub.microcategories && sub.microcategories.length > 0 && (
                                    openCollapsibles[sub.id] ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        </CollapsibleTrigger>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/sub:opacity-100 bg-muted/95 px-1 py-0.5 rounded-md shadow-sm border border-border/60 z-10 transition-opacity">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => handleMoveSubcategory(category, subIdx, 'up')}
                                disabled={subIdx === 0}
                                title="Move subcategory up"
                             >
                                <ArrowUp className="h-3 w-3" />
                             </Button>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => handleMoveSubcategory(category, subIdx, 'down')}
                                disabled={subIdx === category.subcategories.length - 1}
                                title="Move subcategory down"
                             >
                                <ArrowDown className="h-3 w-3" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddMicrocategory(category, sub)} title="Add Micro Category">
                                <PlusCircle className="h-3 w-3" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditSubcategory(category, sub)} title="Edit Subcategory">
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
                                        This will permanently delete the <strong>{sub.name}</strong> subcategory and all its micro categories.
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
                            {(sub.microcategories || []).map((micro, microIdx) => (
                                <div key={micro.id} className="group/micro relative">
                                    <Badge variant="secondary" className="pr-12">
                                        {micro.name}
                                    </Badge>
                                    <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover/micro:opacity-100 bg-secondary/80 rounded-full px-1">
                                        <button 
                                          onClick={() => handleMoveMicrocategory(category, sub, microIdx, 'left')} 
                                          disabled={microIdx === 0} 
                                          className="mr-1 text-xs disabled:opacity-30" 
                                          title="Move left"
                                        >
                                            <ArrowLeft className="h-3 w-3" />
                                        </button>
                                        <button 
                                          onClick={() => handleMoveMicrocategory(category, sub, microIdx, 'right')} 
                                          disabled={microIdx === (sub.microcategories || []).length - 1} 
                                          className="mr-1 text-xs disabled:opacity-30" 
                                          title="Move right"
                                        >
                                            <ArrowRight className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => handleEditMicrocategory(category, sub, micro)} className="mr-1 text-xs" title="Edit Micro Category">
                                            <Edit className="h-3 w-3" />
                                        </button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="mr-1 text-destructive" title="Delete Micro Category">
                                                <Trash2 className="h-3 w-3" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the <strong>{micro.name}</strong> micro category.
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
                            {(sub.microcategories || []).length === 0 && <p className="text-xs text-muted-foreground">No micro categories.</p>}
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
