
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/provider';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { Settings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countryLocales = [
  { value: 'en-US', label: 'United States (USD)' },
  { value: 'en-IN', label: 'India (INR)' },
  { value: 'en-GB', label: 'United Kingdom (GBP)' },
  { value: 'en-CA', label: 'Canada (CAD)' },
  { value: 'en-AU', label: 'Australia (AUD)' },
  { value: 'de-DE', label: 'Germany (EUR)' },
  { value: 'ja-JP', label: 'Japan (JPY)' },
];

export default function SettingsPage() {
  const { settings, updateSettings, loadingSettings, selectedTenantId, tenants, editTenant } = useApp();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting: isSubmittingSettings, isDirty: isDirtySettings },
  } = useForm<Omit<Settings, 'tenantId'>>();

  useEffect(() => {
 if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: Omit<Settings, 'tenantId'>) => {
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

  const {
    register: registerTenant,
    handleSubmit: handleSubmitTenant,
    reset: resetTenant,
    formState: { isSubmitting: isSubmittingTenant, isDirty: isDirtyTenant },
  } = useForm<{ name: string }>();

  useEffect(() => {
    const currentTenant = tenants.find(t => t.id === selectedTenantId);
    if (currentTenant) {
      resetTenant({ name: currentTenant.name });
    }
  }, [selectedTenantId, tenants, resetTenant]);

  const onTenantNameSubmit = async (data: { name: string }) => {
    if (!selectedTenantId) return;
    await editTenant(selectedTenantId, data);
    toast({
      title: 'Tenant Name Updated',
      description: 'The tenant name has been updated successfully.',
    });
    resetTenant(data); // Resets the form's dirty state
  };

  if (loadingSettings) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full md:w-1/3" />
            </div>
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitTenant(onTenantNameSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Tenant Name</Label>
              <Input
                id="tenantName"
                {...registerTenant('name')}
                className="w-full md:w-1/3"
                disabled={!selectedTenantId || isSubmittingTenant}
              />
            </div>
            <Button type="submit" disabled={isSubmittingTenant || !isDirtyTenant || !selectedTenantId}>
              {isSubmittingTenant && <Loader2 className="mr-2 animate-spin" />}
              Save Tenant Name
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
