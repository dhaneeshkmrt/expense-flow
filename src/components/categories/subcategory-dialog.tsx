
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/provider';
import type { Category, Subcategory } from '@/lib/types';

const subcategorySchema = z.object({
  name: z.string().min(2, 'Subcategory name must be at least 2 characters.'),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

interface SubcategoryDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  category: Category | null | Omit<Category, 'budget'> & { budget?: number };
  subcategory?: Subcategory | null;
  onAdd?: (categoryId: string, data: any) => Promise<void>;
  onEdit?: (categoryId: string, subcategoryId: string, data: any) => Promise<void>;
  isDefaultCategory?: boolean;
}

export function SubcategoryDialog({ open, setOpen, category, subcategory, onAdd, onEdit, isDefaultCategory = false }: SubcategoryDialogProps) {
  const { addSubcategory: appAddSubcategory, editSubcategory: appEditSubcategory } = useApp();
  const isEditing = !!subcategory;

  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isEditing && subcategory) {
      form.reset({ name: subcategory.name });
    } else {
      form.reset({ name: '' });
    }
  }, [subcategory, isEditing, open, form]);

  const onSubmit = (data: SubcategoryFormValues) => {
    if (!category) return;

    const finalOnAdd = onAdd || appAddSubcategory;
    const finalOnEdit = onEdit || appEditSubcategory;

    if (isEditing && subcategory) {
      finalOnEdit(category.id, subcategory.id, data);
    } else {
      finalOnAdd(category.id, data);
    }
    setOpen(false);
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Subcategory' : 'Add a New Subcategory'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `You are editing "${subcategory?.name}"` : `Adding to "${category.name}" category.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Haircut" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Subcategory</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
