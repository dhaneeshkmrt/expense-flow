'use client';

import { useApp } from '@/lib/provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';

export default function CategoriesPage() {
  const { categories } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage your expense categories and subcategories.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          Add Category
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary" />
                  <span>{category.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.subcategories.map((sub) => (
                    <Badge key={sub.id} variant="secondary">
                      {sub.name}
                    </Badge>
                  ))}
                  {category.subcategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subcategories yet.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                 <Button variant="ghost" size="sm">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Subcategory
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
