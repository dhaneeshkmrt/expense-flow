'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tenant, User } from '@/lib/types';
import { toast } from './use-toast';

const AUTH_STORAGE_KEY = 'expenseflow_auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Check for persisted user session on mount
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        setUser(authData.user);
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  const signIn = async (mobileNo: string, secretToken: string): Promise<boolean> => {
    setLoadingAuth(true);
    try {
      const tenantsCollection = collection(db, 'tenants');
      const q = query(tenantsCollection);
      const querySnapshot = await getDocs(q);

      let foundUser: User | null = null;
      let foundTenant: Tenant | null = null;

      for (const doc of querySnapshot.docs) {
        const tenant = { id: doc.id, ...doc.data() } as Tenant;

        // Check main tenant credentials
        if (tenant.mobileNo === mobileNo && tenant.secretToken === secretToken) {
          foundUser = { name: tenant.name, tenantId: tenant.id };
          foundTenant = tenant;
          break;
        }

        // Check member credentials
        if (tenant.members && tenant.members.length > 0) {
          const member = tenant.members.find(
            m => m.mobileNo === mobileNo && m.secretToken === secretToken
          );
          if (member) {
            foundUser = { name: member.name, tenantId: tenant.id };
            foundTenant = tenant;
            break;
          }
        }
      }

      if (foundUser && foundTenant) {
        setUser(foundUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: foundUser, tenant: foundTenant }));
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      toast({ title: 'Sign In Failed', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return { user, loadingAuth, signIn, signOut };
}
