'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tenant, User } from '@/lib/types';

const generateSecretToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export function useTenants(
    seedDefaultCategories: (tenantId: string) => Promise<void>,
    seedDefaultSettings: (tenantId: string) => Promise<any>,
    user: User | null
) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(true);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTenants = async () => {
            setLoadingTenants(true);
            try {
                const tenantsCollection = collection(db, "tenants");
                const querySnapshot = await getDocs(query(tenantsCollection, orderBy("name")));
                const fetchedTenants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

                if (fetchedTenants.length === 0) {
                    const defaultTenantData: Omit<Tenant, 'id'> = {
                        name: 'dhanisha',
                        mobileNo: '1234567890',
                        address: '',
                        secretToken: generateSecretToken(),
                        members: [],
                        isRootUser: true,
                    };
                    const docRef = await addDoc(tenantsCollection, defaultTenantData);
                    const defaultTenant = { id: docRef.id, ...defaultTenantData };
                    
                    await seedDefaultCategories(defaultTenant.id);
                    await seedDefaultSettings(defaultTenant.id);

                    setTenants([defaultTenant]);
                    // Let auth handle setting the tenant
                } else {
                    setTenants(fetchedTenants);
                }
            } catch (error) {
                console.error("Error fetching tenants: ", error);
            } finally {
                setLoadingTenants(false);
            }
        };
        fetchTenants();
    }, [seedDefaultCategories, seedDefaultSettings]);
    
    useEffect(() => {
        if(user?.tenantId) {
            setSelectedTenantId(user.tenantId)
        }
    }, [user]);

    const handleSetSelectedTenantId = (tenantId: string | null) => {
        if(user && tenantId !== user.tenantId) {
            console.warn("setSelectedTenantId was called with a different tenantId than the logged-in user's tenantId. This is not allowed in the current auth model.");
            return;
        }
        setSelectedTenantId(tenantId);
    };

    const addTenant = async (tenantData: Omit<Tenant, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'tenants'), tenantData);
            const newTenant = { id: docRef.id, ...tenantData };
    
            await seedDefaultCategories(newTenant.id);
            await seedDefaultSettings(newTenant.id);
    
            setTenants(prev => [...prev, newTenant].sort((a,b) => a.name.localeCompare(b.name)));
            
        } catch(e) {
            console.error("Error adding tenant: ", e);
        }
    };

    const editTenant = async (tenantId: string, tenantData: Partial<Omit<Tenant, 'id'>>) => {
        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, tenantData);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...tenantData } as Tenant : t).sort((a,b) => a.name.localeCompare(b.name)));
        } catch(e) {
            console.error("Error updating tenant: ", e);
        }
    };

    const deleteTenant = async (tenantId: string) => {
        try {
            if(user?.tenantId === tenantId) {
                alert("You cannot delete the tenant you are currently logged into.");
                return;
            }
            await deleteDoc(doc(db, 'tenants', tenantId));
            const remainingTenants = tenants.filter(t => t.id !== tenantId);
            setTenants(remainingTenants);
        } catch(e) {
            console.error("Error deleting tenant: ", e);
        }
    };


    return {
        tenants,
        loadingTenants,
        selectedTenantId,
        setSelectedTenantId: handleSetSelectedTenantId,
        addTenant,
        editTenant,
        deleteTenant,
    };
}
