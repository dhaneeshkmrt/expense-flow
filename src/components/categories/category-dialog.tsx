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
import type { Category } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    Briefcase,
    Gift,
    HeartPulse,
    Home,
    Utensils,
    Car,
    Plane,
    ShieldAlert,
    GraduationCap,
    Sparkles,
    ShoppingBag,
    CircleDollarSign,
    Factory,
    HelpCircle,
    Building,
    User,
    Calendar,
    Apple
} from 'lucide-react';

const iconList = [
    { name: 'Briefcase', component: Briefcase },
    { name: 'Gift', component: Gift },
    { name: 'HeartPulse', component: HeartPulse },
    { name: 'Home', component: Home },
    { name: 'Utensils', component: Utensils },
    { name: 'Car', component: Car },
    { name: 'Plane', component: Plane },
    { name: 'ShieldAlert', component: ShieldAlert },
    { name: 'GraduationCap', component: GraduationCap },
    { name: 'Sparkles', component: Sparkles },
    { name: 'ShoppingBag', component: ShoppingBag },
    { name: 'CircleDollarSign', component: CircleDollarSign },
    { name: 'Factory', component: Factory },
    { name: 'HelpCircle', component: HelpCircle },
    { name: 'Building', component: Building },
    { name: 'User', component: User },
    { name: 'Calendar', component: Calendar },
    { name: 'Apple', component: Apple },
];


const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
  icon: z.string().min(1, 'Please select an icon.'),
  budget: z.coerce.number().min(0, 'Budget must be a positive number.').optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryDialog({ open, setOpen, category }: CategoryDialogProps) {
  const { addCategory, editCategory } = useApp();
  const isEditing = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: '',
      budget: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && category) {
        const iconName = iconList.find(icon => icon.component === category.icon)?.name;
        form.reset({
          name: category.name,
          icon: iconName || '',
          budget: category.budget || 0,
        });
      } else {
        form.reset({ name: '', icon: '', budget: 0 });
      }
    }
  }, [category, isEditing, open, form]);

  const onSubmit = (data: CategoryFormValues) => {
    if (isEditing && category) {
      editCategory(category.id, data);
    } else {
      addCategory(data);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add a New Category'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `You are editing "${category?.name}".` : 'Enter the details for your new category.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Personal Care" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconList.map((icon) => {
                          const IconComponent = icon.component;
                          return (
                            <SelectItem key={icon.name} value={icon.name}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <span>{icon.name}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Budget (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Category</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
