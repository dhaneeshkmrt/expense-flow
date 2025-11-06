
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
import type { Category, Subcategory, Microcategory } from '@/lib/types';

const microcategorySchema = z.object({
  name: z.string().min(2, 'Micro-subcategory name must be at least 2 characters.'),
});

type MicrocategoryFormValues = z.infer<typeof microcategorySchema>;

interface MicrocategoryDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  category: Category | null | Omit<Category, 'budget'> & { budget?: number };
  subcategory: Subcategory | null;
  microcategory?: Microcategory | null;
  onAdd?: (categoryId: string, subcategoryId: string, data: any) => Promise<void>;
  onEdit?: (categoryId: string, subcategoryId: string, microcategoryId: string, data: any) => Promise<void>;
  isDefaultCategory?: boolean;
}

export function MicrocategoryDialog({ open, setOpen, category, subcategory, microcategory, onAdd, onEdit, isDefaultCategory = false }: MicrocategoryDialogProps) {
  const { addMicrocategory: appAddMicrocategory, editMicrocategory: appEditMicrocategory } = useApp();
  const isEditing = !!microcategory;

  const form = useForm<MicrocategoryFormValues>({
    resolver: zodResolver(microcategorySchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isEditing && microcategory) {
      form.reset({ name: microcategory.name });
    } else {
      form.reset({ name: '' });
    }
  }, [microcategory, isEditing, open, form]);

  const onSubmit = (data: MicrocategoryFormValues) => {
    if (!category || !subcategory) return;

    const finalOnAdd = onAdd || appAddMicrocategory;
    const finalOnEdit = onEdit || appEditMicrocategory;

    if (isEditing && microcategory) {
      finalOnEdit(category.id, subcategory.id, microcategory.id, data);
    } else {
      finalOnAdd(category.id, subcategory.id, data);
    }
    setOpen(false);
  };

  if (!category || !subcategory) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Micro-Subcategory' : 'Add a New Micro-Subcategory'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `You are editing "${microcategory?.name}"` : `Adding to "${subcategory.name}" subcategory.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Micro-Subcategory Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Shampoo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Micro-Subcategory</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
