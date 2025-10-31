
'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/provider';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, Trash2, Copy, RefreshCw } from 'lucide-react';
import type { Settings, Tenant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const dynamic = 'force-dynamic';

const countryLocales = [
  { value: 'en-US', label: 'United States (USD)' },
  { value: 'en-IN', label: 'India (INR)' },
  { value: 'en-GB', label: 'United Kingdom (GBP)' },
  { value: 'en-CA', label: 'Canada (CAD)' },
  { value: 'en-AU', label: 'Australia (AUD)' },
  { value: 'de-DE', label: 'Germany (EUR)' },
  { value: 'ja-JP', label: 'Japan (JPY)' },
];

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
  paidByOptions: z.array(z.object({
    name: z.string().min(1, 'Paid by option cannot be empty.'),
  })).min(1, 'At least one "Paid by" option is required.'),
  members: z.array(z.object({
    name: z.string().min(2, 'Member name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email for the member.'),
    mobileNo: z.string().optional(),
    secretToken: z.string().min(1, 'Secret Token is required.'),
  })).optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;


export default function SettingsPage() {
  const { settings, updateSettings, loadingSettings, selectedTenantId, tenants, editTenant, isMainTenantUser } = useApp();
  
  const [isTenantSubmitting, setIsTenantSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting: isSubmittingSettings, isDirty: isDirtySettings },
  } = useForm<Omit<Settings, 'tenantId'>>();

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
        name: '',
        paidByOptions: [],
        members: [],
    }
  });

  const { fields: paidByFields, append: appendPaidBy, remove: removePaidBy, update: updatePaidBy } = useFieldArray({
      control: tenantForm.control,
      name: "paidByOptions",
  });
  
  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: tenantForm.control,
    name: "members",
  });

  const watchedName = tenantForm.watch('name');

  useEffect(() => {
    // Only reset the form if it's not dirty and settings are available.
    if (settings && !isDirtySettings) {
      reset(settings);
    }
  }, [settings, isDirtySettings, reset]);

  useEffect(() => {
    const currentTenant = tenants.find(t => t.id === selectedTenantId);
    if (currentTenant && !tenantForm.formState.isDirty) {
      tenantForm.reset({ 
        name: currentTenant.name,
        paidByOptions: currentTenant.paidByOptions?.map(name => ({name})) || [{ name: currentTenant.name }],
        members: currentTenant.members || [],
       });
    }
  }, [selectedTenantId, tenants, tenantForm.reset, tenantForm.formState.isDirty]);

  useEffect(() => {
    if (tenantForm.formState.isDirty && watchedName && paidByFields.length > 0) {
        updatePaidBy(0, { name: watchedName });
    }
  }, [watchedName, tenantForm.formState.isDirty, paidByFields, updatePaidBy]);

  const onSettingsSubmit = async (data: Omit<Settings, 'tenantId'>) => {
    if (!selectedTenantId) {
        toast({
 title: 'No Tenant Selected',
 description: 'Please select a tenant before saving settings.',
 variant: 'destructive',
        });
        return;
    }
    await updateSettings(data);
    toast({
 title: 'Settings Saved',
 description: 'Your new settings have been saved successfully.',
    });
    reset(data); // Resets the form's dirty state
  };
  
  const onTenantSubmit = async (data: TenantFormValues) => {
    if (!selectedTenantId) return;
    setIsTenantSubmitting(true);
    const tenantData = {
        name: data.name,
        paidByOptions: data.paidByOptions.map(opt => opt.name).filter(Boolean),
        members: data.members || [],
    };

    try {
        await editTenant(selectedTenantId, tenantData);
        toast({
          title: 'Tenant Details Updated',
          description: 'Your tenant information has been updated successfully.',
        });
        tenantForm.reset(data); // Resets dirty state
    } catch(e) {
        console.error(e);
        toast({ title: "Update Failed", description: "Could not update tenant details.", variant: "destructive" });
    } finally {
        setIsTenantSubmitting(false);
    }
  };

  const handleCopyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Copied!', description: 'Secret token copied to clipboard.' });
  }


  if (loadingSettings) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      {isMainTenantUser && (
        <Card>
            <CardHeader>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>Manage your tenant name, payment methods, and family members.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...tenantForm}>
                <form onSubmit={tenantForm.handleSubmit(onTenantSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField
                      control={tenantForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full md:w-1/3" disabled={isTenantSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                        <FormLabel>Paid By Options</FormLabel>
                        <div className="space-y-2 mt-2">
                        {paidByFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                            <FormField
                                control={tenantForm.control}
                                name={`paidByOptions.${index}.name`}
                                render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                    <Input {...field} placeholder="e.g., Credit Card" readOnly={index === 0} className="w-full md:w-1/3" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            {index > 0 && (
                                <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive"
                                onClick={() => removePaidBy(index)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendPaidBy({ name: '' })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Option
                        </Button>
                        </div>
                    </div>

                    <div>
                      <FormLabel>Family Members</FormLabel>
                      <div className="space-y-4 mt-2">
                        {memberFields.map((field, index) => (
                          <div key={field.id} className="p-4 border rounded-md relative space-y-2">
                             <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 text-destructive"
                              onClick={() => removeMember(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <FormField
                              control={tenantForm.control}
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
                              control={tenantForm.control}
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
                              control={tenantForm.control}
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
                                    <Button type="button" variant="outline" size="icon" onClick={() => tenantForm.setValue(`members.${index}.secretToken`, generateSecretToken())}>
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
                          onClick={() => appendMember({ name: '', email: '', mobileNo: '', secretToken: generateSecretToken() })}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Member
                        </Button>
                      </div>
                    </div>
                    
                    <Button type="submit" disabled={isTenantSubmitting || !tenantForm.formState.isDirty}>
                    {isTenantSubmitting && <Loader2 className="mr-2 animate-spin" />}
                    Save Tenant Details
                    </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
           <CardDescription>Configure currency and number formatting for your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSettingsSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency Symbol</Label>
                  <Input
                    id="currency"
                    {...register('currency')}
                    className="w-full md:w-2/3"
                    disabled={!selectedTenantId}
                    placeholder="e.g. ₹, $, €"
                  />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="locale">Country for Formatting</Label>
                    <Controller
                        name="locale"
                        control={control}
                        render={({ field }) => (
                             <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTenantId}>
                                <SelectTrigger className="w-full md:w-2/3">
                                    <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countryLocales.map(cl => (
                                        <SelectItem key={cl.value} value={cl.value}>
                                            {cl.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            <Button type="submit" disabled={isSubmittingSettings || !isDirtySettings || !selectedTenantId}>
              {isSubmittingSettings && <Loader2 className="mr-2 animate-spin" />}
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    