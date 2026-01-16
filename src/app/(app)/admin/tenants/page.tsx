
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { columns as createTenantColumns } from '@/components/tenants/columns';
import { DataTable } from '@/components/transactions/data-table';
import { TenantDialog } from '@/components/tenants/tenant-dialog';
import type { Tenant } from '@/lib/types';

export const dynamic = 'force-dynamic';

const AccessDenied = () => (
    <div className="flex flex-col gap-6 items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-destructive"/>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page. Please contact your administrator.</p>
    </div>
);

export default function TenantsPage() {
  const { tenants, loadingTenants, isAdminUser } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setDialogOpen(true);
  };

  const tenantColumns = useMemo(
    () => createTenantColumns(setSelectedTenant, setDialogOpen),
    []
  );
  
  if (loadingTenants) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return <AccessDenied />;
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage your tenants and their members.
          </p>
        </div>
        {isAdminUser && (
          <Button onClick={handleAddTenant}>
            <PlusCircle className="mr-2" />
            Add Tenant
          </Button>
        )}
      </div>
      <DataTable columns={tenantColumns} data={tenants} />
      <TenantDialog open={dialogOpen} setOpen={setDialogOpen} tenant={selectedTenant} setSelectedTenant={setSelectedTenant} />
    </div>
  );
}
