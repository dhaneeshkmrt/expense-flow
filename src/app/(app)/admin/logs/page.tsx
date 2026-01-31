
'use client';

import { useApp } from '@/lib/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { columns } from '@/components/logs/columns';
import { DataTable } from '@/components/transactions/data-table';
import type { AuditLog } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const AccessDenied = () => (
    <div className="flex flex-col gap-6 items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-destructive"/>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page. Please contact your administrator.</p>
    </div>
);

export default function LogsPage() {
    const { logs, loadingLogs, isAdminUser, userTenant } = useApp();

    if (loadingLogs) {
        return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="mt-2 h-5 w-72" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          );
    }
    
    if (!isAdminUser || !userTenant?.featureAccess?.logs) {
        return <AccessDenied />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Track all changes made within the application.
                    </p>
                </div>
            </div>
            <DataTable columns={columns} data={(logs || []) as AuditLog[]} showFilters={true} />
        </div>
    )
}
