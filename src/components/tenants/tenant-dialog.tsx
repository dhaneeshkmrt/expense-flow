
'use client';

import { useEffect, useCallback } from 'react';
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
import type { Tenant, FeatureAccess } from '@/lib/types';
import { PlusCircle, Trash2, Copy, RefreshCw, Landmark, Wallet, Database, Wand2, Calculator, Shield, BellRing, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';

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
  email: z.string().email('Please enter a valid email address.'),
  mobileNo: z.string().optional(),
  address: z.string().optional(),
  secretToken: z.string().min(1, 'Secret Token is required.'),
  members: z.array(z.object({
    name: z.string().min(2, 'Member name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email for the member.'),
    mobileNo: z.string().optional(),
    secretToken: z.string().min(1, 'Secret Token is required.'),
  })).optional(),
  paidByOptions: z.array(z.object({
    name: z.string().min(1, 'Paid by option cannot be empty.'),
  })).min(1, 'At least one "Paid by" option is required.'),
  featureAccess: z.object({
    balanceSheet: z.boolean().optional(),
    virtualAccounts: z.boolean().optional(),
    yearlyReport: z.boolean().optional(),
    aiImageStudio: z.boolean().optional(),
    calculators: z.boolean().optional(),
    admin: z.boolean().optional(),
    reminders: z.boolean().optional(),
    logs: z.boolean().optional(),
  }).optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

const featureList: { id: keyof FeatureAccess, label: string, icon: React.ElementType }[] = [
    { id: 'balanceSheet', label: 'Balance Sheet', icon: Landmark },
    { id: 'virtualAccounts', label: 'Virtual Accounts', icon: Wallet },
    { id: 'yearlyReport', label: 'Yearly Report', icon: Database },
    { id: 'aiImageStudio', label: 'AI Image Studio', icon: Wand2 },
    { id: 'calculators', label: 'Calculators', icon: Calculator },
    { id: 'reminders', label: 'Reminders', icon: BellRing },
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'logs', label: 'Audit Logs', icon: ScrollText },
];


interface TenantDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant?: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
}

export function TenantDialog({ open, setOpen, tenant, setSelectedTenant }: TenantDialogProps) {
  const { addTenant, editTenant, isAdminUser } = useApp();
  const { toast } = useToast();
  const isEditing = !!tenant;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      email: '',
      mobileNo: '',
      address: '',
      secretToken: '',
      members: [],
      paidByOptions: [{ name: 'Cash' }],
      featureAccess: {
        balanceSheet: false,
        virtualAccounts: false,
        yearlyReport: false,
        aiImageStudio: false,
        calculators: false,
        admin: false,
        reminders: false,
        logs: false,
      }
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'members',
  });

  const { fields: paidByFields, append: appendPaidBy, remove: removePaidBy } = useFieldArray({
      control: form.control,
      name: "paidByOptions",
  });

  const handleGenerateToken = () => {
    form.setValue('secretToken', generateSecretToken(), { shouldDirty: true });
  }

  const handleCopyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Copied!', description: 'Secret token copied to clipboard.' });
  }

  const handleClose = useCallback(() => {
    setOpen(false);
    setSelectedTenant(null);
    form.reset();
  }, [form, setOpen, setSelectedTenant]);
  

  useEffect(() => {
    if (open) {
        if (tenant) {
          form.reset({
            name: tenant.name,
            email: tenant.email,
            mobileNo: tenant.mobileNo,
            address: tenant.address,
            secretToken: tenant.secretToken,
            members: tenant.members || [],
            paidByOptions: tenant.paidByOptions?.map(name => ({ name })) || [{ name: 'Cash' }],
            featureAccess: {
              balanceSheet: tenant.featureAccess?.balanceSheet ?? false,
              virtualAccounts: tenant.featureAccess?.virtualAccounts ?? false,
              yearlyReport: tenant.featureAccess?.yearlyReport ?? false,
              aiImageStudio: tenant.featureAccess?.aiImageStudio ?? false,
              calculators: tenant.featureAccess?.calculators ?? false,
              admin: tenant.featureAccess?.admin ?? false,
              reminders: tenant.featureAccess?.reminders ?? false,
              logs: tenant.featureAccess?.logs ?? false,
            }
          });
        } else {
          form.reset({
            name: '',
            email: '',
            mobileNo: '',
            address: '',
            secretToken: generateSecretToken(),
            members: [],
            paidByOptions: [{ name: 'Cash' }],
            featureAccess: {
                balanceSheet: false,
                virtualAccounts: false,
                yearlyReport: false,
                aiImageStudio: false,
                calculators: false,
                admin: false,
                reminders: false,
                logs: false,
            }
          });
        }
    }
  }, [tenant, open, form]);

  const onSubmit = (data: TenantFormValues) => {
    const tenantData = {
        ...data,
        members: data.members || [],
        paidByOptions: data.paidByOptions?.map(opt => opt.name).filter(Boolean) || [],
    };
    if (isEditing && tenant) {
      editTenant(tenant.id, tenantData);
    } else {
      addTenant(tenantData);
    }
    handleClose();
  };
  
  if (!isAdminUser) {
    return null;
  }

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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobileNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number (Optional)</FormLabel>
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
            
            <Separator />
            
            <div>
                <h3 className="text-base font-medium mb-4">Feature Access</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featureList.map((feature) => (
                    <FormField
                      key={feature.id}
                      control={form.control}
                      name={`featureAccess.${feature.id}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl>
                              <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                              />
                           </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="flex items-center gap-2">
                                <feature.icon className="w-4 h-4"/>
                                {feature.label}
                              </FormLabel>
                            </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
            </div>

            <Separator />

            <div>
              <FormLabel>Paid By Options</FormLabel>
              <div className="space-y-2 mt-2">
                {paidByFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`paidByOptions.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input {...field} placeholder="e.g., Credit Card" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => removePaidBy(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPaidBy({ name: '' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add "Paid By" Option
                </Button>
              </div>
            </div>

            <Separator />

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
                      name={`members.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., member@example.com"/>
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
                  onClick={() => append({ name: '', email: '', mobileNo: '', secretToken: generateSecretToken() })}
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
