'use client';

import { useState } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { SubcategoryDialog } from '@/components/categories/subcategory-dialog';
import type { Category, Subcategory } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function CategoriesPage() {
  const { categories, deleteCategory, deleteSubcategory } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [isCategoryDialog, setIsCategoryDialog] = useState(false);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsCategoryDialog(true);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsCategoryDialog(true);
    setDialogOpen(true);
  };

  const handleAddSubcategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setIsCategoryDialog(false);
    setDialogOpen(true);
  };

  const handleEditSubcategory = (category: Category, subcategory: Subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setIsCategoryDialog(false);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your expense categories and subcategories.</p>
        </div>
        <Button onClick={handleAddCategory}>
          <PlusCircle className="mr-2" />
          Add Category
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary" />
                  <span>{category.name}</span>
                </CardTitle>
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
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.subcategories.map((sub) => (
                    <div key={sub.id} className="group relative">
                      <Badge variant="secondary" className="pr-7">
                        {sub.name}
                      </Badge>
                      <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100">
                        <button onClick={() => handleEditSubcategory(category, sub)} className="mr-3 text-xs">
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
                                This action cannot be undone. This will permanently delete the <strong>{sub.name}</strong> subcategory.
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
                  ))}
                  {category.subcategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subcategories yet.</p>
                  )}
                </div>
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
      {isCategoryDialog ? (
        <CategoryDialog open={dialogOpen} setOpen={setDialogOpen} category={selectedCategory} />
      ) : (
        <SubcategoryDialog open={dialogOpen} setOpen={setDialogOpen} category={selectedCategory} subcategory={selectedSubcategory} />
      )}
    </div>
  );
}
