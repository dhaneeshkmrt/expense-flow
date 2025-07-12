'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TenantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Tenant management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
