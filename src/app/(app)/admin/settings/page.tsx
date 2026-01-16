
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
import { Loader2, PlusCircle, Trash2, Copy, RefreshCw, Palette, Sun, Moon } from 'lucide-react';
import type { Settings, Tenant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const settingsSchema = z.object({
  currency: z.string().min(1, 'Currency symbol is required.'),
  locale: z.string().min(1, 'Country selection is required.'),
  dateInputStyle: z.enum(['popup', 'inline']),
});

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

type SettingsFormValues = z.infer<typeof settingsSchema>;
type TenantFormValues = z.infer<typeof tenantSchema>;

const colorThemes = [
    { value: 'default', label: 'Default', preview: 'bg-primary' },
    { value: 'rainbow', label: 'Rainbow', preview: 'bg-gradient-to-r from-pink-500 to-cyan-500' },
    { value: 'ocean', label: 'Ocean', preview: 'bg-gradient-to-r from-blue-600 to-cyan-400' },
    { value: 'sunset', label: 'Sunset', preview: 'bg-gradient-to-r from-orange-500 to-pink-600' },
    { value: 'forest', label: 'Forest', preview: 'bg-gradient-to-r from-green-600 to-lime-500' },
    { value: 'electric', label: 'Electric', preview: 'bg-gradient-to-r from-purple-600 to-cyan-500' },
];

export default function SettingsPage() {
  const { settings, updateSettings, loadingSettings, selectedTenantId, tenants, editTenant, isMainTenantUser } = useApp();
  const { theme, colorTheme, setColorTheme, toggleTheme } = useTheme();
  
  const [isTenantSubmitting, setIsTenantSubmitting] = useState(false);

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const tenantForm = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
        name: '',
        paidByOptions: [],
        members: [],
    }
  });

  const { fields: paidByFields, append: appendPaidBy, remove: removePaidBy } = useFieldArray({
      control: tenantForm.control,
      name: "paidByOptions",
  });
  
  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: tenantForm.control,
    name: "members",
  });

  useEffect(() => {
    if (settings && !settingsForm.formState.isDirty) {
      settingsForm.reset({
        currency: settings.currency,
        locale: settings.locale,
        dateInputStyle: settings.dateInputStyle || 'popup'
      });
    }
  }, [settings, settingsForm.formState.isDirty, settingsForm.reset]);

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

  const onSettingsSubmit = async (data: SettingsFormValues) => {
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
    settingsForm.reset(data); // Resets the form's dirty state
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
                                    <Input {...field} placeholder="e.g., Credit Card" className="w-full md:w-1/3" />
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
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode-toggle" className="flex items-center gap-2">
              <Moon />
              <span>Theme</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              id="dark-mode-toggle"
            >
              {theme === 'dark' ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="color-theme-selector" className="flex items-center gap-2">
              <Palette />
              <span>Color Palette</span>
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="color-theme-selector" variant="outline">
                  {colorThemes.find(ct => ct.value === colorTheme)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {colorThemes.map((colorOption) => (
                  <DropdownMenuItem
                    key={colorOption.value}
                    onClick={() => setColorTheme(colorOption.value as any)}
                    className="flex items-center justify-between"
                  >
                    <span>{colorOption.label}</span>
                    <div className={`w-4 h-4 rounded-full ${colorOption.preview} ${
                      colorTheme === colorOption.value ? 'ring-2 ring-foreground' : ''
                    }`} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
           <CardDescription>Configure currency, number formatting, and UI preferences for your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency Symbol</Label>
                    <Input
                      id="currency"
                      {...settingsForm.register('currency')}
                      className="w-full md:w-2/3"
                      disabled={!selectedTenantId}
                      placeholder="e.g. ₹, $, €"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="locale">Country for Formatting</Label>
                      <Controller
                          name="locale"
                          control={settingsForm.control}
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
                  <FormField
                    control={settingsForm.control}
                    name="dateInputStyle"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1 md:col-span-2">
                        <div className="space-y-0.5">
                          <FormLabel>Date Input Style</FormLabel>
                          <FormDescription>
                            Show a full calendar instead of a popup in the transaction form.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 'inline'}
                            onCheckedChange={(checked) => field.onChange(checked ? 'inline' : 'popup')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </div>
              <Button type="submit" disabled={settingsForm.formState.isSubmitting || !settingsForm.formState.isDirty || !selectedTenantId}>
                {settingsForm.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
