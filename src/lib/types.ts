export type Microcategory = {
  id: string;
  name: string;
};

export type Subcategory = {
  id: string;
  name: string;
  microcategories: Microcategory[];
};

export type Category = {
  id: string;
  name: string;
  icon: React.ElementType | string;
  subcategories: Subcategory[];
  tenantId: string;
  userId?: string;
  isDefault?: boolean;
  budgets?: Record<string, number>; // e.g. { "2024-07": 500 }
};

export type Transaction = {
  id: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  microcategory?: string;
  paidBy: string;
  notes?: string;
  tenantId: string;
  userId?: string;
};

export type Settings = {
  currency: string;
  tenantId: string;
};

export type TenantMember = {
  name: string;
  mobileNo?: string;
  secretToken: string;
};

export type Tenant = {
  id: string;
  name: string;
  mobileNo: string;
  address?: string;
  secretToken: string;
  members: TenantMember[];
  isRootUser?: boolean;
};

export type User = {
    name: string;
    tenantId: string;
};
