'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/lib/provider';
import type { Tenant } from '@/lib/types';
import { PlusCircle, Trash2, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const generateSecretToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const tenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  mobileNo: z.string().min(10, 'Mobile number must be at least 10 digits.'),
  address: z.string().optional(),
  secretToken: z.string().min(1, 'Secret Token is required.'),
  members: z.array(z.object({
    name: z.string().min(2, 'Member name must be at least 2 characters.'),
    mobileNo: z.string().optional(),
    secretToken: z.string().min(1, 'Secret Token is required.'),
  })).optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

interface TenantDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant?: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
}

export function TenantDialog({ open, setOpen, tenant, setSelectedTenant }: TenantDialogProps) {
  const { addTenant, editTenant } = useApp();
  const { toast } = useToast();
  const isEditing = !!tenant;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      mobileNo: '',
      address: '',
      secretToken: '',
      members: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'members',
  });
  
  const handleGenerateToken = () => {
    form.setValue('secretToken', generateSecretToken(), { shouldDirty: true });
  }

  const handleCopyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Copied!', description: 'Secret token copied to clipboard.' });
  }

  useEffect(() => {
    if (open) {
        if (tenant) {
          form.reset({
            name: tenant.name,
            mobileNo: tenant.mobileNo,
            address: tenant.address,
            secretToken: tenant.secretToken,
            members: tenant.members || [],
          });
        } else {
          form.reset({
            name: '',
            mobileNo: '',
            address: '',
            secretToken: generateSecretToken(),
            members: [],
          });
        }
    }
  }, [tenant, open, form]);

  const onSubmit = (data: TenantFormValues) => {
    const tenantData = {
        ...data,
        members: data.members || []
    };
    if (isEditing && tenant) {
      editTenant(tenant.id, tenantData);
    } else {
      addTenant(tenantData);
    }
    handleClose();
  };
  
  const handleClose = () => {
    setOpen(false);
    setSelectedTenant(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `You are editing "${tenant?.name}".` : 'Enter the details for the new tenant.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="secretToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Token</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input readOnly {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleCopyToClipboard(field.value)}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={handleGenerateToken}>
                        <RefreshCw className="h-4 w-4"/>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobileNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 123 Main St, Anytown" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Family Members</FormLabel>
              <div className="space-y-4 mt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField
                      control={form.control}
                      name={`members.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Jane Doe"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`members.${index}.mobileNo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Mobile (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 9876543211"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`members.${index}.secretToken`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Secret Token</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input readOnly {...field} />
                            </FormControl>
                            <Button type="button" variant="outline" size="icon" onClick={() => handleCopyToClipboard(field.value)}>
                                <Copy className="h-4 w-4"/>
                            </Button>
                            <Button type="button" variant="outline" size="icon" onClick={() => form.setValue(`members.${index}.secretToken`, generateSecretToken())}>
                                <RefreshCw className="h-4 w-4"/>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', mobileNo: '', secretToken: generateSecretToken() })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Save Tenant</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
