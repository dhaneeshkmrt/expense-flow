
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, doc, where, writeBatch } from 'firebase/firestore';
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

    const userTenant = useMemo(() => {
        if (!user || !tenants.length) return null;
        return tenants.find(t => t.id === user.tenantId);
    }, [user, tenants]);
    
    const isRootUser = useMemo(() => {
        if (!userTenant || !user) return false;
        return !!userTenant.isRootUser;
    }, [userTenant]);

    const isMainTenantUser = useMemo(() => {
        if (!userTenant || !user) return false;
        return user.name === userTenant.name;
    }, [user, userTenant]);


    useEffect(() => {
        const fetchTenants = async () => {
            setLoadingTenants(true);
            try {
                const tenantsCollection = collection(db, "tenants");
                const querySnapshot = await getDocs(query(tenantsCollection, orderBy("name")));
                let fetchedTenants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

                if (fetchedTenants.length === 0) {
                    const defaultTenantData: Omit<Tenant, 'id'> = {
                        name: 'dhanisha',
                        mobileNo: '1234567890',
                        address: '',
                        secretToken: generateSecretToken(),
                        members: [],
                        isRootUser: true,
                        paidByOptions: ['dhanisha', 'DKD', 'NC', 'DKC'],
                    };
                    const docRef = await addDoc(tenantsCollection, defaultTenantData);
                    const defaultTenant = { id: docRef.id, ...defaultTenantData };
                    
                    await seedDefaultCategories(defaultTenant.id);
                    await seedDefaultSettings(defaultTenant.id);

                    fetchedTenants = [defaultTenant];
                }

                setTenants(fetchedTenants);
                
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
        } else {
            setSelectedTenantId(null);
        }
    }, [user]);

    const handleSetSelectedTenantId = (tenantId: string | null) => {
        if (isRootUser) {
            setSelectedTenantId(tenantId);
        } else if (user && tenantId !== user.tenantId) {
            console.warn("Attempted to switch tenant for non-root user. Denied.");
            return;
        } else {
            setSelectedTenantId(tenantId);
        }
    };

    const addTenant = async (tenantData: Partial<Omit<Tenant, 'id'>>) => {
        try {
            const docRef = await addDoc(collection(db, 'tenants'), tenantData);
            const newTenant = { id: docRef.id, ...tenantData } as Tenant;
    
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
            if(selectedTenantId === tenantId) {
                setSelectedTenantId(user?.tenantId ?? null);
            }

            const batch = writeBatch(db);

            // Delete categories
            const categoriesQuery = query(collection(db, 'categories'), where('tenantId', '==', tenantId));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            categoriesSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete transactions
            const transactionsQuery = query(collection(db, 'transactions'), where('tenantId', '==', tenantId));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
            
            // Delete settings
            const settingsRef = doc(db, 'settings', tenantId);
            batch.delete(settingsRef);

            // Delete the tenant itself
            const tenantRef = doc(db, 'tenants', tenantId);
            batch.delete(tenantRef);
            
            await batch.commit();

            const remainingTenants = tenants.filter(t => t.id !== tenantId);
            setTenants(remainingTenants);

        } catch(e) {
            console.error("Error deleting tenant and associated data: ", e);
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
        userTenant,
        isRootUser,
        isMainTenantUser
    };
}
